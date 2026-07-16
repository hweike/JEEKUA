<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9"
    xmlns:xhtml="http://www.w3.org/1999/xhtml">
    
    <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>

    <!-- 模板匹配根节点 -->
    <xsl:template match="/">
        <html>
        <head>
            <title>XML Sitemap</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                h1 { color: #333; }
                ul { list-style: none; padding-left: 20px; }
                li { margin: 5px 0; }
                .url { font-weight: bold; color: #0066cc; }
                .meta { color: #666; font-size: 0.9em; margin-left: 10px; }
                .hreflang { color: #009900; font-size: 0.9em; margin-left: 10px; }
            </style>
        </head>
        <body>
            <h1>Sitemap</h1>
            <ul>
                <!-- 应用模板处理所有 <url> 元素 -->
                <xsl:apply-templates select="//sitemap:url"/>
            </ul>
        </body>
        </html>
    </xsl:template>

    <!-- 处理每个 <url> 元素 -->
    <xsl:template match="sitemap:url">
        <li>
            <div class="url">
                <xsl:value-of select="sitemap:loc"/>
            </div>
            <div class="meta">
                Last modified: <xsl:value-of select="sitemap:lastmod"/>
                <xsl:if test="sitemap:priority">
                    | Priority: <xsl:value-of select="sitemap:priority"/>
                </xsl:if>
            </div>
            <!-- 处理 hreflang 信息 -->
            <xsl:for-each select="xhtml:link">
                <div class="hreflang">
                    <xsl:value-of select="@hreflang"/>: <xsl:value-of select="@href"/>
                </div>
            </xsl:for-each>
        </li>
    </xsl:template>
</xsl:stylesheet>