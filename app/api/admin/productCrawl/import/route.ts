// app/api/admin/productCrawl/import/route.ts
import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db/admin';
import { createProduct, processVariant, processImages } from '@/lib/products/services/product.service';
import { ImportTransformer } from '@/lib/productCrawl/import-transformer';
import { createProgress, updateProgress } from '@/lib/productCrawl/import-progress';
import { randomUUID } from 'crypto';
import type { ImportResultItem } from '@/lib/productCrawl/types';

const DEFAULT_SITE_ID = '000001';

function cleanImageUrl(url: string): string {
  if (!url) return '';
  let clean = url.split('?')[0];
  if (clean.endsWith('.jpg.jpg')) clean = clean.slice(0, -4);
  if (clean.endsWith('.png.png')) clean = clean.slice(0, -4);
  if (clean.endsWith('.jpeg.jpeg')) clean = clean.slice(0, -5);
  if (clean.endsWith('.gif.gif')) clean = clean.slice(0, -4);
  if (clean.endsWith('.webp.webp')) clean = clean.slice(0, -5);
  return clean;
}

export async function POST(request: NextRequest) {
  console.log('🔵 ========== 导入路由开始 ==========');

  try {
    const body = await request.json();
    const {
      crawlerIds,
      categoryId,
      seriesId = '',
      locale = 'zh',
      siteId = DEFAULT_SITE_ID,
    } = body;

    if (!crawlerIds || !Array.isArray(crawlerIds) || crawlerIds.length === 0) {
      return NextResponse.json({ error: '请提供要导入的 crawlerId 列表' }, { status: 400 });
    }

    if (!categoryId) {
      return NextResponse.json({ error: '请选择分类' }, { status: 400 });
    }

    const taskId = randomUUID();

    // ✅ 查询总记录数
    let total = 0;
    try {
      const countRows = await sql<{ count: string }[]>`
        SELECT COUNT(*)::text AS count FROM public.crawler_products
        WHERE site_id = ${siteId}
          AND crawler_id IN ${sql(crawlerIds)}
          AND import_status = 'pending'
      `;
      total = parseInt(countRows[0]?.count || '0', 10);
    } catch (countError: any) {
      throw new Error(`查询记录数失败: ${countError.message}`);
    }

    if (total === 0) {
      return NextResponse.json({
        success: true,
        taskId,
        message: '没有待导入的数据',
      });
    }

    createProgress(taskId, total);
    updateProgress(taskId, {
      status: 'processing',
      message: '开始导入...',
    });

    // 异步执行
    (async () => {
      await performImport({
        taskId,
        crawlerIds,
        categoryId,
        seriesId,
        locale,
        siteId,
        total,
      });
    })();

    return NextResponse.json({
      success: true,
      taskId,
      message: '导入已开始，请查看进度',
    });
  } catch (error) {
    console.error('❌ 导入启动失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '导入启动失败',
      },
      { status: 500 }
    );
  }
}

async function performImport(params: {
  taskId: string;
  crawlerIds: string[];
  categoryId: string;
  seriesId: string;
  locale: string;
  siteId: string;
  total: number;
}) {
  const { taskId, crawlerIds, categoryId, seriesId, locale, siteId, total } = params;

  console.log(`🔵 [任务 ${taskId}] 开始执行导入`);

  try {
    // ✅ 查询采集数据
    let products: any[];
    try {
      products = await sql<any[]>`
        SELECT * FROM public.crawler_products
        WHERE site_id = ${siteId}
          AND crawler_id IN ${sql(crawlerIds)}
          AND import_status = 'pending'
      `;
    } catch (fetchError: any) {
      throw new Error(`获取待导入数据失败: ${fetchError.message}`);
    }

    if (!products || products.length === 0) {
      updateProgress(taskId, {
        status: 'completed',
        message: '没有待导入的数据',
      });
      return;
    }

    console.log(`🔵 [任务 ${taskId}] 找到 ${products.length} 条待导入数据`);

    const transformer = new ImportTransformer(locale, categoryId, seriesId);
    const results: ImportResultItem[] = [];
    let importedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (let index = 0; index < products.length; index++) {
      const product = products[index];

      console.log(`🔵 [任务 ${taskId}] 处理产品 ${index + 1}/${total}: ${product.product_name}`);

      updateProgress(taskId, {
        current: index + 1,
        currentProduct: product.product_name,
        message: `正在导入产品 ${index + 1}/${total}: ${product.product_name}`,
      });

      const resultItem: ImportResultItem = {
        crawler_id: product.crawler_id,
        sku: product.sku,
        source_url: product.source_url,
        status: 'processing',
        message: '处理中...',
      };

      try {
        // ✅ 检查 SKU 是否已存在
        console.log(`🔵 [任务 ${taskId}] 检查 SKU 是否存在: ${product.sku}`);
        let existing: { productId: string; product_name: string | null } | undefined;
        try {
          const rows = await sql<{ productId: string; product_name: string | null }[]>`
            SELECT "productId", product_name FROM public.products
            WHERE site_id = ${siteId}
              AND sku = ${product.sku}
              AND locale = ${locale}
            LIMIT 1
          `;
          existing = rows[0];
        } catch (checkError: any) {
          console.warn(`🔵 [任务 ${taskId}] 检查 SKU 失败:`, checkError);
        }

        if (existing) {
          console.log(`🔵 [任务 ${taskId}] SKU "${product.sku}" 已存在，跳过`);
          resultItem.status = 'skipped';
          resultItem.message = `SKU "${product.sku}" 已存在，跳过导入`;
          resultItem.product_id = existing.productId;
          skippedCount++;

          await markImportStatus(product.crawler_id, 'skipped', resultItem.message);
          results.push(resultItem);

          updateProgress(taskId, {
            message: `已跳过 ${skippedCount} 条（SKU已存在）`,
          });
          continue;
        }

        // 解析 sku_list
        let skuList: any[] = [];
        if (product.sku_list) {
          try {
            skuList = typeof product.sku_list === 'string'
              ? JSON.parse(product.sku_list)
              : product.sku_list;
            console.log(`🔵 [任务 ${taskId}] sku_list 解析成功，数量: ${skuList.length}`);
          } catch (e) {
            console.warn(`🔵 [任务 ${taskId}] 解析 sku_list 失败:`, e);
          }
        }

        // 转换数据
        const productData = transformer.transform(product);

        const parentData = {
          product_name: productData.product_name || product.product_name || '',
          sku: productData.sku || product.sku || '',
          categoryId: categoryId,
          seriesId: seriesId || null,
          brand: productData.brand || product.brand || '',
          price: productData.price || parseFloat(product.price_tiers?.[0]?.price) || 0,
          currency: productData.currency || product.currency || 'CNY',
          main_image_url: productData.main_image_url || product.main_image_url || '',
          additional_images: productData.additional_images || product.additional_images || [],
          description: productData.description || product.description || '',
          short_description: productData.short_description || product.short_description || '',
          attributes: productData.attributes || product.attributes || {},
          spec_text: productData.spec_text || product.spec_text || '',
          availability: productData.availability || product.availability || 'in_stock',
          min_order_quantity: productData.min_order_quantity || product.min_order_quantity || 1,
          platform: productData.platform || product.platform || '',
          source_url: productData.source_url || product.source_url || '',
          source_product_id: productData.source_product_id || product.source_product_id || '',
          slug: productData.slug || product.slug || '',
          status: 'draft',
          price_tiers: product.price_tiers || productData.price_tiers || [],
          templateId: product.templateId || '',
        };

        console.log(`🔵 [任务 ${taskId}] 开始创建父产品...`);
        let parentResult;
        try {
          parentResult = await createProduct(locale, parentData);
          console.log(`🔵 [任务 ${taskId}] 父产品创建成功`);
        } catch (createErr) {
          console.error(`❌ [任务 ${taskId}] 父产品创建失败:`, createErr);
          throw createErr;
        }

        const parentProductId = parentResult.productId || parentResult.id;
        console.log(`🔵 [任务 ${taskId}] 父产品 ID: ${parentProductId}`);

        // 创建变体
        let variantSuccessCount = 0;
        if (skuList && skuList.length > 0) {
          console.log(`🔵 [任务 ${taskId}] 开始创建 ${skuList.length} 个变体...`);
          updateProgress(taskId, {
            message: `正在创建 ${skuList.length} 个变体...`,
          });

          for (let vIndex = 0; vIndex < skuList.length; vIndex++) {
            const skuItem = skuList[vIndex];

            console.log(`🔵 [任务 ${taskId}] 创建变体 ${vIndex + 1}/${skuList.length}: ${skuItem.name || '未命名'}`);

            updateProgress(taskId, {
              currentVariant: skuItem.name || `变体 ${vIndex + 1}`,
              message: `创建变体 ${vIndex + 1}/${skuList.length}: ${skuItem.name || ''}`,
            });

            try {
              const rawVariantImage =
                skuItem.image ||
                skuItem.image_url ||
                skuItem.main_image_url ||
                skuItem.img ||
                '';

              const cleanedImage = cleanImageUrl(rawVariantImage);

              let mainImageUrl = cleanedImage || product.main_image_url || '';
              let additionalImages: string[] = [];

              try {
                const variantProductId = `${parentProductId}-variant-${vIndex}`;
                const processed = await processImages(
                  variantProductId,
                  cleanedImage || '',
                  []
                );
                mainImageUrl = processed.mainImageUrl || cleanedImage || product.main_image_url || '';
                additionalImages = processed.additionalImages || [];
                console.log(`🔵 [任务 ${taskId}] 变体图片处理完成: ${mainImageUrl}`);
              } catch (imgError) {
                console.warn(`🔵 [任务 ${taskId}] 变体图片处理失败，使用原始 URL: ${cleanedImage || '无'}`);
                mainImageUrl = cleanedImage || product.main_image_url || '';
              }

              const variantData = {
                product_name: skuItem.name || `${product.product_name} - ${skuItem.id || vIndex}`,
                sku: skuItem.sku_code || skuItem.id || `${product.sku}-V${String(vIndex + 1).padStart(3, '0')}`,
                short_description: skuItem.name || product.short_description || '',
                main_image_url: mainImageUrl,
                additional_images: additionalImages,
                attributes: skuItem.attributes || {},
                slug: '',
                seo_title: '',
                seo_description: '',
                seo_keywords: '',
                templateId: '',
                price: skuItem.price || parentData.price || 0,
                currency: skuItem.currency || parentData.currency || 'CNY',
                stock: skuItem.stock || 0,
                price_tiers: skuItem.price ? [{ min_qty: 1, max_qty: null, price: skuItem.price, currency: skuItem.currency || parentData.currency || 'CNY' }] : [],
              };

              await processVariant(
                locale,
                parentProductId,
                variantData,
                [],
                true
              );
              variantSuccessCount++;
              console.log(`🔵 [任务 ${taskId}] 变体 ${vIndex + 1} 创建成功`);
            } catch (variantErr) {
              const errorMsg = variantErr instanceof Error ? variantErr.message : String(variantErr);
              console.error(`❌ [任务 ${taskId}] 变体 ${vIndex + 1} 创建失败:`, {
                name: skuItem.name,
                sku: skuItem.sku_code,
                error: errorMsg,
              });
            }
          }

          console.log(`🔵 [任务 ${taskId}] 变体创建完成: 成功 ${variantSuccessCount}/${skuList.length}`);
        }

        await markImportStatus(product.crawler_id, 'imported', null);

        importedCount++;

        resultItem.status = 'success';
        resultItem.message = skuList && skuList.length > 0
          ? `父产品 + ${variantSuccessCount}/${skuList.length} 个变体`
          : '导入成功';
        resultItem.product_id = parentProductId;

        results.push(resultItem);
        console.log(`🔵 [任务 ${taskId}] 产品 ${index + 1} 导入成功`);

        updateProgress(taskId, {
          message: `已成功导入 ${importedCount} 条${skippedCount > 0 ? `，跳过 ${skippedCount} 条` : ''}`,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : '未知错误';
        console.error(`❌ [任务 ${taskId}] 产品 ${index + 1} 导入失败:`, msg);

        resultItem.status = 'failed';
        resultItem.message = msg;
        failedCount++;

        await markImportStatus(product.crawler_id, 'failed', msg);
        results.push(resultItem);

        updateProgress(taskId, {
          message: `导入失败: ${msg}`,
        });
      }
    }

    updateProgress(taskId, {
      status: 'completed',
      current: total,
      message: `导入完成：成功 ${importedCount} 条${skippedCount > 0 ? `，跳过 ${skippedCount} 条` : ''}${failedCount > 0 ? `，失败 ${failedCount} 条` : ''}`,
      results: results,
    });

    console.log(`✅ [任务 ${taskId}] 导入完成`);
    console.log(`📊 [任务 ${taskId}] 统计: 成功 ${importedCount}, 跳过 ${skippedCount}, 失败 ${failedCount}`);
  } catch (error) {
    console.error(`❌ [任务 ${taskId}] 导入失败:`, error);
    updateProgress(taskId, {
      status: 'failed',
      message: error instanceof Error ? error.message : '导入失败',
    });
  }
}

async function markImportStatus(
  crawlerId: string,
  status: 'imported' | 'skipped' | 'failed',
  error: string | null
) {
  const now = new Date().toISOString();
  try {
    await sql`
      UPDATE public.crawler_products
      SET import_status = ${status},
          imported_at = ${now},
          import_error = ${error}
      WHERE crawler_id = ${crawlerId}
    `;
  } catch (updateError: any) {
    console.error(`❌ 更新导入状态失败 (${crawlerId}):`, updateError);
  }
}