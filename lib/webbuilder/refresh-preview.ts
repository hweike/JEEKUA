export function refreshPuckPreview() {
  console.log('✅ refreshPuckPreview 执行了');
  if (typeof window === 'undefined') return;

  const iframe = document.querySelector('#preview-frame') as HTMLIFrameElement | null;
  if (!iframe?.contentDocument) return;

  const doc = iframe.contentDocument;
  const sections = doc.querySelectorAll('section[data-puck-component^="Section-"]');
  
  sections.forEach(section => {
    const innerDiv = section.querySelector(':scope > div') as HTMLElement | null;
    if (!innerDiv) return;

    const computed = getComputedStyle(section);
    
    // 直接应用所有布局样式
    innerDiv.style.display = 'flex';
    innerDiv.style.flexDirection = computed.getPropertyValue('--section-direction').trim() || 'column';
    innerDiv.style.flexWrap = computed.getPropertyValue('--section-wrap').trim() || 'nowrap';
    innerDiv.style.justifyContent = computed.getPropertyValue('--section-justify').trim() || 'flex-start';
    innerDiv.style.alignItems = computed.getPropertyValue('--section-align').trim() || 'stretch';
    innerDiv.style.gap = computed.getPropertyValue('--section-gap').trim() || '0px';
    innerDiv.style.width = computed.getPropertyValue('--section-content-width').trim() || '100%';
    innerDiv.style.maxWidth = computed.getPropertyValue('--section-max-width').trim() || 'none';
    innerDiv.style.marginLeft = computed.getPropertyValue('--section-margin-left').trim() || '0px';
    innerDiv.style.marginRight = computed.getPropertyValue('--section-margin-right').trim() || '0px';
    innerDiv.style.paddingTop = computed.getPropertyValue('--section-padding-top').trim() || '0px';
    innerDiv.style.paddingRight = computed.getPropertyValue('--section-padding-right').trim() || '0px';
    innerDiv.style.paddingBottom = computed.getPropertyValue('--section-padding-bottom').trim() || '0px';
    innerDiv.style.paddingLeft = computed.getPropertyValue('--section-padding-left').trim() || '0px';
    innerDiv.style.minHeight = computed.getPropertyValue('--section-min-height').trim() || 'auto';
    innerDiv.style.height = computed.getPropertyValue('--section-height').trim() || 'auto';

    // 强制重绘
    innerDiv.style.transform = 'translateZ(0)';
    requestAnimationFrame(() => {
      innerDiv.style.transform = '';
    });
  });
}