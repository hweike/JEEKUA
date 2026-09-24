// 自动生成，请勿手动编辑
export const PREVIEW_STYLES = `@import url("https://fastly.jsdelivr.net/gh/w3labkr/noto-cjk/subset/NotoSansSC/slim/font.min.css");

/* ============================================================
   globals.css - 样式入口文件
   职责：按顺序导入各层样式，不包含具体样式定义
   ============================================================ */

/* 第一层：基础（Tailwind + 全局重置 + 共享样式） */

/* ============================================================
   base.css - Tailwind 指令 + 全局重置 + 共享样式
   
   包含：
   - Tailwind 标准入口
   - 本地字体（Geist / Inter / Plus Jakarta Sans）
   - CDN 字体（Noto Sans SC 分片）
   - 默认 CSS 变量（后台及前台降级使用）
   - 全局样式
   - 编辑器样式（ProseMirror）
   - Shopify 超级菜单样式
   
   说明：
   - 后台使用 Tailwind 类名（text-sm、p-4 等），固定不变
   - 前台组件使用 CSS 变量（var(--font-size-sm) 等），跟随主题
   - 字体策略：
     * 英文：Geist（正文）/ Plus Jakarta Sans（标题）
     * 中文：Noto Sans SC（CDN 分片，按需加载）
     * 其他语言：系统字体 + Noto Sans 兜底
   ============================================================ */

/* ---------- CDN 字体：Noto Sans SC（必须放在所有规则之前） ---------- */

/* ---------- Tailwind 标准入口 ---------- */

*, ::before, ::after{
  --tw-border-spacing-x: 0;
  --tw-border-spacing-y: 0;
  --tw-translate-x: 0;
  --tw-translate-y: 0;
  --tw-rotate: 0;
  --tw-skew-x: 0;
  --tw-skew-y: 0;
  --tw-scale-x: 1;
  --tw-scale-y: 1;
  --tw-pan-x:  ;
  --tw-pan-y:  ;
  --tw-pinch-zoom:  ;
  --tw-scroll-snap-strictness: proximity;
  --tw-gradient-from-position:  ;
  --tw-gradient-via-position:  ;
  --tw-gradient-to-position:  ;
  --tw-ordinal:  ;
  --tw-slashed-zero:  ;
  --tw-numeric-figure:  ;
  --tw-numeric-spacing:  ;
  --tw-numeric-fraction:  ;
  --tw-ring-inset:  ;
  --tw-ring-offset-width: 0px;
  --tw-ring-offset-color: #fff;
  --tw-ring-color: rgb(59 130 246 / 0.5);
  --tw-ring-offset-shadow: 0 0 #0000;
  --tw-ring-shadow: 0 0 #0000;
  --tw-shadow: 0 0 #0000;
  --tw-shadow-colored: 0 0 #0000;
  --tw-blur:  ;
  --tw-brightness:  ;
  --tw-contrast:  ;
  --tw-grayscale:  ;
  --tw-hue-rotate:  ;
  --tw-invert:  ;
  --tw-saturate:  ;
  --tw-sepia:  ;
  --tw-drop-shadow:  ;
  --tw-backdrop-blur:  ;
  --tw-backdrop-brightness:  ;
  --tw-backdrop-contrast:  ;
  --tw-backdrop-grayscale:  ;
  --tw-backdrop-hue-rotate:  ;
  --tw-backdrop-invert:  ;
  --tw-backdrop-opacity:  ;
  --tw-backdrop-saturate:  ;
  --tw-backdrop-sepia:  ;
  --tw-contain-size:  ;
  --tw-contain-layout:  ;
  --tw-contain-paint:  ;
  --tw-contain-style:  ;
}

::backdrop{
  --tw-border-spacing-x: 0;
  --tw-border-spacing-y: 0;
  --tw-translate-x: 0;
  --tw-translate-y: 0;
  --tw-rotate: 0;
  --tw-skew-x: 0;
  --tw-skew-y: 0;
  --tw-scale-x: 1;
  --tw-scale-y: 1;
  --tw-pan-x:  ;
  --tw-pan-y:  ;
  --tw-pinch-zoom:  ;
  --tw-scroll-snap-strictness: proximity;
  --tw-gradient-from-position:  ;
  --tw-gradient-via-position:  ;
  --tw-gradient-to-position:  ;
  --tw-ordinal:  ;
  --tw-slashed-zero:  ;
  --tw-numeric-figure:  ;
  --tw-numeric-spacing:  ;
  --tw-numeric-fraction:  ;
  --tw-ring-inset:  ;
  --tw-ring-offset-width: 0px;
  --tw-ring-offset-color: #fff;
  --tw-ring-color: rgb(59 130 246 / 0.5);
  --tw-ring-offset-shadow: 0 0 #0000;
  --tw-ring-shadow: 0 0 #0000;
  --tw-shadow: 0 0 #0000;
  --tw-shadow-colored: 0 0 #0000;
  --tw-blur:  ;
  --tw-brightness:  ;
  --tw-contrast:  ;
  --tw-grayscale:  ;
  --tw-hue-rotate:  ;
  --tw-invert:  ;
  --tw-saturate:  ;
  --tw-sepia:  ;
  --tw-drop-shadow:  ;
  --tw-backdrop-blur:  ;
  --tw-backdrop-brightness:  ;
  --tw-backdrop-contrast:  ;
  --tw-backdrop-grayscale:  ;
  --tw-backdrop-hue-rotate:  ;
  --tw-backdrop-invert:  ;
  --tw-backdrop-opacity:  ;
  --tw-backdrop-saturate:  ;
  --tw-backdrop-sepia:  ;
  --tw-contain-size:  ;
  --tw-contain-layout:  ;
  --tw-contain-paint:  ;
  --tw-contain-style:  ;
}

/* ! tailwindcss v3.4.19 | MIT License | https://tailwindcss.com */

/*
1. Prevent padding and border from affecting element width. (https://github.com/mozdevs/cssremedy/issues/4)
2. Allow adding a border to an element by just adding a border-width. (https://github.com/tailwindcss/tailwindcss/pull/116)
*/

*,
::before,
::after {
  box-sizing: border-box;
  /* 1 */
  border-width: 0;
  /* 2 */
  border-style: solid;
  /* 2 */
  border-color: #e5e7eb;
  /* 2 */
}

::before,
::after {
  --tw-content: '';
}

/*
1. Use a consistent sensible line-height in all browsers.
2. Prevent adjustments of font size after orientation changes in iOS.
3. Use a more readable tab size.
4. Use the user's configured \`sans\` font-family by default.
5. Use the user's configured \`sans\` font-feature-settings by default.
6. Use the user's configured \`sans\` font-variation-settings by default.
7. Disable tap highlights on iOS
*/

html,
:host {
  line-height: 1.5;
  /* 1 */
  -webkit-text-size-adjust: 100%;
  /* 2 */
  -moz-tab-size: 4;
  /* 3 */
  -o-tab-size: 4;
     tab-size: 4;
  /* 3 */
  font-family: ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
  /* 4 */
  font-feature-settings: normal;
  /* 5 */
  font-variation-settings: normal;
  /* 6 */
  -webkit-tap-highlight-color: transparent;
  /* 7 */
}

/*
1. Remove the margin in all browsers.
2. Inherit line-height from \`html\` so users can set them as a class directly on the \`html\` element.
*/

body {
  margin: 0;
  /* 1 */
  line-height: inherit;
  /* 2 */
}

/*
1. Add the correct height in Firefox.
2. Correct the inheritance of border color in Firefox. (https://bugzilla.mozilla.org/show_bug.cgi?id=190655)
3. Ensure horizontal rules are visible by default.
*/

hr {
  height: 0;
  /* 1 */
  color: inherit;
  /* 2 */
  border-top-width: 1px;
  /* 3 */
}

/*
Add the correct text decoration in Chrome, Edge, and Safari.
*/

abbr:where([title]) {
  -webkit-text-decoration: underline dotted;
          text-decoration: underline dotted;
}

/*
Remove the default font size and weight for headings.
*/

h1,
h2,
h3,
h4,
h5,
h6 {
  font-size: inherit;
  font-weight: inherit;
}

/*
Reset links to optimize for opt-in styling instead of opt-out.
*/

a {
  color: inherit;
  text-decoration: inherit;
}

/*
Add the correct font weight in Edge and Safari.
*/

b,
strong {
  font-weight: bolder;
}

/*
1. Use the user's configured \`mono\` font-family by default.
2. Use the user's configured \`mono\` font-feature-settings by default.
3. Use the user's configured \`mono\` font-variation-settings by default.
4. Correct the odd \`em\` font sizing in all browsers.
*/

code,
kbd,
samp,
pre {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  /* 1 */
  font-feature-settings: normal;
  /* 2 */
  font-variation-settings: normal;
  /* 3 */
  font-size: 1em;
  /* 4 */
}

/*
Add the correct font size in all browsers.
*/

small {
  font-size: 80%;
}

/*
Prevent \`sub\` and \`sup\` elements from affecting the line height in all browsers.
*/

sub,
sup {
  font-size: 75%;
  line-height: 0;
  position: relative;
  vertical-align: baseline;
}

sub {
  bottom: -0.25em;
}

sup {
  top: -0.5em;
}

/*
1. Remove text indentation from table contents in Chrome and Safari. (https://bugs.chromium.org/p/chromium/issues/detail?id=999088, https://bugs.webkit.org/show_bug.cgi?id=201297)
2. Correct table border color inheritance in all Chrome and Safari. (https://bugs.chromium.org/p/chromium/issues/detail?id=935729, https://bugs.webkit.org/show_bug.cgi?id=195016)
3. Remove gaps between table borders by default.
*/

table {
  text-indent: 0;
  /* 1 */
  border-color: inherit;
  /* 2 */
  border-collapse: collapse;
  /* 3 */
}

/*
1. Change the font styles in all browsers.
2. Remove the margin in Firefox and Safari.
3. Remove default padding in all browsers.
*/

button,
input,
optgroup,
select,
textarea {
  font-family: inherit;
  /* 1 */
  font-feature-settings: inherit;
  /* 1 */
  font-variation-settings: inherit;
  /* 1 */
  font-size: 100%;
  /* 1 */
  font-weight: inherit;
  /* 1 */
  line-height: inherit;
  /* 1 */
  letter-spacing: inherit;
  /* 1 */
  color: inherit;
  /* 1 */
  margin: 0;
  /* 2 */
  padding: 0;
  /* 3 */
}

/*
Remove the inheritance of text transform in Edge and Firefox.
*/

button,
select {
  text-transform: none;
}

/*
1. Correct the inability to style clickable types in iOS and Safari.
2. Remove default button styles.
*/

button,
input:where([type='button']),
input:where([type='reset']),
input:where([type='submit']) {
  -webkit-appearance: button;
  /* 1 */
  background-color: transparent;
  /* 2 */
  background-image: none;
  /* 2 */
}

/*
Use the modern Firefox focus style for all focusable elements.
*/

:-moz-focusring {
  outline: auto;
}

/*
Remove the additional \`:invalid\` styles in Firefox. (https://github.com/mozilla/gecko-dev/blob/2f9eacd9d3d995c937b4251a5557d95d494c9be1/layout/style/res/forms.css#L728-L737)
*/

:-moz-ui-invalid {
  box-shadow: none;
}

/*
Add the correct vertical alignment in Chrome and Firefox.
*/

progress {
  vertical-align: baseline;
}

/*
Correct the cursor style of increment and decrement buttons in Safari.
*/

::-webkit-inner-spin-button,
::-webkit-outer-spin-button {
  height: auto;
}

/*
1. Correct the odd appearance in Chrome and Safari.
2. Correct the outline style in Safari.
*/

[type='search'] {
  -webkit-appearance: textfield;
  /* 1 */
  outline-offset: -2px;
  /* 2 */
}

/*
Remove the inner padding in Chrome and Safari on macOS.
*/

::-webkit-search-decoration {
  -webkit-appearance: none;
}

/*
1. Correct the inability to style clickable types in iOS and Safari.
2. Change font properties to \`inherit\` in Safari.
*/

::-webkit-file-upload-button {
  -webkit-appearance: button;
  /* 1 */
  font: inherit;
  /* 2 */
}

/*
Add the correct display in Chrome and Safari.
*/

summary {
  display: list-item;
}

/*
Removes the default spacing and border for appropriate elements.
*/

blockquote,
dl,
dd,
h1,
h2,
h3,
h4,
h5,
h6,
hr,
figure,
p,
pre {
  margin: 0;
}

fieldset {
  margin: 0;
  padding: 0;
}

legend {
  padding: 0;
}

ol,
ul,
menu {
  list-style: none;
  margin: 0;
  padding: 0;
}

/*
Reset default styling for dialogs.
*/

dialog {
  padding: 0;
}

/*
Prevent resizing textareas horizontally by default.
*/

textarea {
  resize: vertical;
}

/*
1. Reset the default placeholder opacity in Firefox. (https://github.com/tailwindlabs/tailwindcss/issues/3300)
2. Set the default placeholder color to the user's configured gray 400 color.
*/

input::-moz-placeholder, textarea::-moz-placeholder {
  opacity: 1;
  /* 1 */
  color: #9ca3af;
  /* 2 */
}

input::placeholder,
textarea::placeholder {
  opacity: 1;
  /* 1 */
  color: #9ca3af;
  /* 2 */
}

/*
Set the default cursor for buttons.
*/

button,
[role="button"] {
  cursor: pointer;
}

/*
Make sure disabled buttons don't get the pointer cursor.
*/

:disabled {
  cursor: default;
}

/*
1. Make replaced elements \`display: block\` by default. (https://github.com/mozdevs/cssremedy/issues/14)
2. Add \`vertical-align: middle\` to align replaced elements more sensibly by default. (https://github.com/jensimmons/cssremedy/issues/14#issuecomment-634934210)
   This can trigger a poorly considered lint error in some tools but is included by design.
*/

img,
svg,
video,
canvas,
audio,
iframe,
embed,
object {
  display: block;
  /* 1 */
  vertical-align: middle;
  /* 2 */
}

/*
Constrain images and videos to the parent width and preserve their intrinsic aspect ratio. (https://github.com/mozdevs/cssremedy/issues/14)
*/

img,
video {
  max-width: 100%;
  height: auto;
}

/* Make elements with the HTML hidden attribute stay hidden by default */

[hidden]:where(:not([hidden="until-found"])) {
  display: none;
}

/* ------------------------------------------------------------
     Geist - 正文主字体（英文）
     ------------------------------------------------------------ */

@font-face {
  font-family: 'Geist';

  src: url('/fonts/geist/Geist-Regular.woff2') format('woff2');

  font-weight: 400;

  font-style: normal;

  font-display: swap;
}

@font-face {
  font-family: 'Geist';

  src: url('/fonts/geist/Geist-Medium.woff2') format('woff2');

  font-weight: 500;

  font-style: normal;

  font-display: swap;
}

@font-face {
  font-family: 'Geist';

  src: url('/fonts/geist/Geist-SemiBold.woff2') format('woff2');

  font-weight: 600;

  font-style: normal;

  font-display: swap;
}

@font-face {
  font-family: 'Geist';

  src: url('/fonts/geist/Geist-Bold.woff2') format('woff2');

  font-weight: 700;

  font-style: normal;

  font-display: swap;
}

/* ------------------------------------------------------------
     Inter - 正文备选（英文）
     ------------------------------------------------------------ */

@font-face {
  font-family: 'Inter';

  src: url('/fonts/inter/Inter-Regular.woff2') format('woff2');

  font-weight: 400;

  font-style: normal;

  font-display: swap;
}

@font-face {
  font-family: 'Inter';

  src: url('/fonts/inter/Inter-Medium.woff2') format('woff2');

  font-weight: 500;

  font-style: normal;

  font-display: swap;
}

@font-face {
  font-family: 'Inter';

  src: url('/fonts/inter/Inter-Bold.woff2') format('woff2');

  font-weight: 700;

  font-style: normal;

  font-display: swap;
}

/* ------------------------------------------------------------
     Plus Jakarta Sans - 标题专用
     ------------------------------------------------------------ */

@font-face {
  font-family: 'Plus Jakarta Sans';

  src: url('/fonts/plus-jakarta-sans/PlusJakartaSans-Regular.woff2') format('woff2');

  font-weight: 400;

  font-style: normal;

  font-display: swap;
}

@font-face {
  font-family: 'Plus Jakarta Sans';

  src: url('/fonts/plus-jakarta-sans/PlusJakartaSans-Medium.woff2') format('woff2');

  font-weight: 500;

  font-style: normal;

  font-display: swap;
}

@font-face {
  font-family: 'Plus Jakarta Sans';

  src: url('/fonts/plus-jakarta-sans/PlusJakartaSans-Bold.woff2') format('woff2');

  font-weight: 700;

  font-style: normal;

  font-display: swap;
}

/* 字体：使用变量（前台跟随主题，后台使用默认值） */

html {
  font-family: var(--font-sans);
}

body {
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
  background-color: var(--background);
  color: var(--foreground);
}

/* ✅ 标题：使用 font-heading（Plus Jakarta Sans） */

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);
  font-weight: 600;
  letter-spacing: -0.025em;
}

/* ✅ 代码：使用 font-mono */

code, pre, kbd, samp {
  font-family: var(--font-mono);
}

a {
  transition: color 150ms ease;
}

* {
  border-color: var(--border);
}

.\\!container{
  width: 100% !important;
}

.container{
  width: 100%;
}

@media (min-width: 640px){
  .\\!container{
    max-width: 640px !important;
  }

  .container{
    max-width: 640px;
  }
}

@media (min-width: 768px){
  .\\!container{
    max-width: 768px !important;
  }

  .container{
    max-width: 768px;
  }
}

@media (min-width: 1024px){
  .\\!container{
    max-width: 1024px !important;
  }

  .container{
    max-width: 1024px;
  }
}

@media (min-width: 1280px){
  .\\!container{
    max-width: 1280px !important;
  }

  .container{
    max-width: 1280px;
  }
}

@media (min-width: 1536px){
  .\\!container{
    max-width: 1536px !important;
  }

  .container{
    max-width: 1536px;
  }
}

.prose{
  color: var(--tw-prose-body);
  max-width: 65ch;
}

.prose :where(p):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  margin-top: 1.25em;
  margin-bottom: 1.25em;
  line-height: 1.8;
}

.prose :where([class~="lead"]):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  color: var(--tw-prose-lead);
  font-size: 1.25em;
  line-height: 1.6;
  margin-top: 1.2em;
  margin-bottom: 1.2em;
}

.prose :where(a):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  color: var(--tw-prose-links);
  text-decoration: underline;
  font-weight: 500;
}

.prose :where(strong):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  color: var(--tw-prose-bold);
  font-weight: 600;
}

.prose :where(a strong):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  color: inherit;
}

.prose :where(blockquote strong):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  color: inherit;
}

.prose :where(thead th strong):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  color: inherit;
}

.prose :where(ol):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  list-style-type: decimal;
  margin-top: 1.25em;
  margin-bottom: 1.25em;
  padding-inline-start: 1.625em;
}

.prose :where(ol[type="A"]):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  list-style-type: upper-alpha;
}

.prose :where(ol[type="a"]):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  list-style-type: lower-alpha;
}

.prose :where(ol[type="A" s]):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  list-style-type: upper-alpha;
}

.prose :where(ol[type="a" s]):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  list-style-type: lower-alpha;
}

.prose :where(ol[type="I"]):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  list-style-type: upper-roman;
}

.prose :where(ol[type="i"]):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  list-style-type: lower-roman;
}

.prose :where(ol[type="I" s]):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  list-style-type: upper-roman;
}

.prose :where(ol[type="i" s]):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  list-style-type: lower-roman;
}

.prose :where(ol[type="1"]):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  list-style-type: decimal;
}

.prose :where(ul):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  list-style-type: disc;
  margin-top: 1.25em;
  margin-bottom: 1.25em;
  padding-inline-start: 1.625em;
}

.prose :where(ol > li):not(:where([class~="not-prose"],[class~="not-prose"] *))::marker{
  font-weight: 400;
  color: var(--tw-prose-counters);
}

.prose :where(ul > li):not(:where([class~="not-prose"],[class~="not-prose"] *))::marker{
  color: var(--tw-prose-bullets);
}

.prose :where(dt):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  color: var(--tw-prose-headings);
  font-weight: 600;
  margin-top: 1.25em;
}

.prose :where(hr):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  border-color: var(--tw-prose-hr);
  border-top-width: 1px;
  margin-top: 3em;
  margin-bottom: 3em;
}

.prose :where(blockquote):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  font-weight: 500;
  font-style: italic;
  color: var(--tw-prose-quotes);
  border-inline-start-width: 0.25rem;
  border-inline-start-color: var(--tw-prose-quote-borders);
  quotes: "\\201C""\\201D""\\2018""\\2019";
  margin-top: 1.6em;
  margin-bottom: 1.6em;
  padding-inline-start: 1em;
}

.prose :where(blockquote p:first-of-type):not(:where([class~="not-prose"],[class~="not-prose"] *))::before{
  content: open-quote;
}

.prose :where(blockquote p:last-of-type):not(:where([class~="not-prose"],[class~="not-prose"] *))::after{
  content: close-quote;
}

.prose :where(h1):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  color: var(--tw-prose-headings);
  font-weight: 800;
  font-size: 2.25em;
  margin-top: 0;
  margin-bottom: 0.8888889em;
  line-height: 1.1111111;
}

.prose :where(h1 strong):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  font-weight: 900;
  color: inherit;
}

.prose :where(h2):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  color: var(--tw-prose-headings);
  font-weight: 700;
  font-size: 1.5em;
  margin-top: 2em;
  margin-bottom: 1em;
  line-height: 1.3333333;
}

.prose :where(h2 strong):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  font-weight: 800;
  color: inherit;
}

.prose :where(h3):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  color: var(--tw-prose-headings);
  font-weight: 600;
  font-size: 1.25em;
  margin-top: 1.6em;
  margin-bottom: 0.6em;
  line-height: 1.6;
}

.prose :where(h3 strong):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  font-weight: 700;
  color: inherit;
}

.prose :where(h4):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  color: var(--tw-prose-headings);
  font-weight: 600;
  margin-top: 1.5em;
  margin-bottom: 0.5em;
  line-height: 1.5;
}

.prose :where(h4 strong):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  font-weight: 700;
  color: inherit;
}

.prose :where(img):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  margin-top: 2em;
  margin-bottom: 2em;
}

.prose :where(picture):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  display: block;
  margin-top: 2em;
  margin-bottom: 2em;
}

.prose :where(video):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  margin-top: 2em;
  margin-bottom: 2em;
}

.prose :where(kbd):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  font-weight: 500;
  font-family: inherit;
  color: var(--tw-prose-kbd);
  box-shadow: 0 0 0 1px var(--tw-prose-kbd-shadows), 0 3px 0 var(--tw-prose-kbd-shadows);
  font-size: 0.875em;
  border-radius: 0.3125rem;
  padding-top: 0.1875em;
  padding-inline-end: 0.375em;
  padding-bottom: 0.1875em;
  padding-inline-start: 0.375em;
}

.prose :where(code):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  color: var(--tw-prose-code);
  font-weight: 600;
  font-size: 0.875em;
}

.prose :where(code):not(:where([class~="not-prose"],[class~="not-prose"] *))::before{
  content: "\`";
}

.prose :where(code):not(:where([class~="not-prose"],[class~="not-prose"] *))::after{
  content: "\`";
}

.prose :where(a code):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  color: inherit;
}

.prose :where(h1 code):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  color: inherit;
}

.prose :where(h2 code):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  color: inherit;
  font-size: 0.875em;
}

.prose :where(h3 code):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  color: inherit;
  font-size: 0.9em;
}

.prose :where(h4 code):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  color: inherit;
}

.prose :where(blockquote code):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  color: inherit;
}

.prose :where(thead th code):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  color: inherit;
}

.prose :where(pre):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  color: var(--tw-prose-pre-code);
  background-color: var(--tw-prose-pre-bg);
  overflow-x: auto;
  font-weight: 400;
  font-size: 0.875em;
  line-height: 1.7142857;
  margin-top: 1.7142857em;
  margin-bottom: 1.7142857em;
  border-radius: 0.375rem;
  padding-top: 0.8571429em;
  padding-inline-end: 1.1428571em;
  padding-bottom: 0.8571429em;
  padding-inline-start: 1.1428571em;
}

.prose :where(pre code):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  background-color: transparent;
  border-width: 0;
  border-radius: 0;
  padding: 0;
  font-weight: inherit;
  color: inherit;
  font-size: inherit;
  font-family: inherit;
  line-height: inherit;
}

.prose :where(pre code):not(:where([class~="not-prose"],[class~="not-prose"] *))::before{
  content: none;
}

.prose :where(pre code):not(:where([class~="not-prose"],[class~="not-prose"] *))::after{
  content: none;
}

.prose :where(table):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  width: 100%;
  table-layout: auto;
  margin-top: 2em;
  margin-bottom: 2em;
  font-size: 0.875em;
  line-height: 1.7142857;
}

.prose :where(thead):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  border-bottom-width: 1px;
  border-bottom-color: var(--tw-prose-th-borders);
}

.prose :where(thead th):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  color: var(--tw-prose-headings);
  font-weight: 600;
  vertical-align: bottom;
  padding-inline-end: 0.5714286em;
  padding-bottom: 0.5714286em;
  padding-inline-start: 0.5714286em;
}

.prose :where(tbody tr):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  border-bottom-width: 1px;
  border-bottom-color: var(--tw-prose-td-borders);
}

.prose :where(tbody tr:last-child):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  border-bottom-width: 0;
}

.prose :where(tbody td):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  vertical-align: baseline;
}

.prose :where(tfoot):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  border-top-width: 1px;
  border-top-color: var(--tw-prose-th-borders);
}

.prose :where(tfoot td):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  vertical-align: top;
}

.prose :where(th, td):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  text-align: start;
}

.prose :where(figure > *):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  margin-top: 0;
  margin-bottom: 0;
}

.prose :where(figcaption):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  color: var(--tw-prose-captions);
  font-size: 0.875em;
  line-height: 1.4285714;
  margin-top: 0.8571429em;
}

.prose{
  --tw-prose-body: #374151;
  --tw-prose-headings: #111827;
  --tw-prose-lead: #4b5563;
  --tw-prose-links: #111827;
  --tw-prose-bold: #111827;
  --tw-prose-counters: #6b7280;
  --tw-prose-bullets: #d1d5db;
  --tw-prose-hr: #e5e7eb;
  --tw-prose-quotes: #111827;
  --tw-prose-quote-borders: #e5e7eb;
  --tw-prose-captions: #6b7280;
  --tw-prose-kbd: #111827;
  --tw-prose-kbd-shadows: rgb(17 24 39 / 10%);
  --tw-prose-code: #111827;
  --tw-prose-pre-code: #e5e7eb;
  --tw-prose-pre-bg: #1f2937;
  --tw-prose-th-borders: #d1d5db;
  --tw-prose-td-borders: #e5e7eb;
  --tw-prose-invert-body: #d1d5db;
  --tw-prose-invert-headings: #fff;
  --tw-prose-invert-lead: #9ca3af;
  --tw-prose-invert-links: #fff;
  --tw-prose-invert-bold: #fff;
  --tw-prose-invert-counters: #9ca3af;
  --tw-prose-invert-bullets: #4b5563;
  --tw-prose-invert-hr: #374151;
  --tw-prose-invert-quotes: #f3f4f6;
  --tw-prose-invert-quote-borders: #374151;
  --tw-prose-invert-captions: #9ca3af;
  --tw-prose-invert-kbd: #fff;
  --tw-prose-invert-kbd-shadows: rgb(255 255 255 / 10%);
  --tw-prose-invert-code: #fff;
  --tw-prose-invert-pre-code: #d1d5db;
  --tw-prose-invert-pre-bg: rgb(0 0 0 / 50%);
  --tw-prose-invert-th-borders: #4b5563;
  --tw-prose-invert-td-borders: #374151;
  font-size: 1rem;
  line-height: 1.7;
}

.prose :where(picture > img):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  margin-top: 0;
  margin-bottom: 0;
}

.prose :where(li):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  margin-top: 0.5em;
  margin-bottom: 0.5em;
}

.prose :where(ol > li):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  padding-inline-start: 0.375em;
}

.prose :where(ul > li):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  padding-inline-start: 0.375em;
}

.prose :where(.prose > ul > li p):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  margin-top: 0.75em;
  margin-bottom: 0.75em;
}

.prose :where(.prose > ul > li > p:first-child):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  margin-top: 1.25em;
}

.prose :where(.prose > ul > li > p:last-child):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  margin-bottom: 1.25em;
}

.prose :where(.prose > ol > li > p:first-child):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  margin-top: 1.25em;
}

.prose :where(.prose > ol > li > p:last-child):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  margin-bottom: 1.25em;
}

.prose :where(ul ul, ul ol, ol ul, ol ol):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  margin-top: 0.75em;
  margin-bottom: 0.75em;
}

.prose :where(dl):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  margin-top: 1.25em;
  margin-bottom: 1.25em;
}

.prose :where(dd):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  margin-top: 0.5em;
  padding-inline-start: 1.625em;
}

.prose :where(hr + *):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  margin-top: 0;
}

.prose :where(h2 + *):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  margin-top: 0;
}

.prose :where(h3 + *):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  margin-top: 0;
}

.prose :where(h4 + *):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  margin-top: 0;
}

.prose :where(thead th:first-child):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  padding-inline-start: 0;
}

.prose :where(thead th:last-child):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  padding-inline-end: 0;
}

.prose :where(tbody td, tfoot td):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  padding-top: 0.5714286em;
  padding-inline-end: 0.5714286em;
  padding-bottom: 0.5714286em;
  padding-inline-start: 0.5714286em;
}

.prose :where(tbody td:first-child, tfoot td:first-child):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  padding-inline-start: 0;
}

.prose :where(tbody td:last-child, tfoot td:last-child):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  padding-inline-end: 0;
}

.prose :where(figure):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  margin-top: 2em;
  margin-bottom: 2em;
}

.prose :where(.prose > :first-child):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  margin-top: 0;
}

.prose :where(.prose > :last-child):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  margin-bottom: 0;
}

.prose-sm{
  font-size: 0.875rem;
  line-height: 1.7142857;
}

.prose-sm :where(p):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  margin-top: 1.1428571em;
  margin-bottom: 1.1428571em;
}

.prose-sm :where([class~="lead"]):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  font-size: 1.2857143em;
  line-height: 1.5555556;
  margin-top: 0.8888889em;
  margin-bottom: 0.8888889em;
}

.prose-sm :where(blockquote):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  margin-top: 1.3333333em;
  margin-bottom: 1.3333333em;
  padding-inline-start: 1.1111111em;
}

.prose-sm :where(h1):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  font-size: 2.1428571em;
  margin-top: 0;
  margin-bottom: 0.8em;
  line-height: 1.2;
}

.prose-sm :where(h2):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  font-size: 1.4285714em;
  margin-top: 1.6em;
  margin-bottom: 0.8em;
  line-height: 1.4;
}

.prose-sm :where(h3):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  font-size: 1.2857143em;
  margin-top: 1.5555556em;
  margin-bottom: 0.4444444em;
  line-height: 1.5555556;
}

.prose-sm :where(h4):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  margin-top: 1.4285714em;
  margin-bottom: 0.5714286em;
  line-height: 1.4285714;
}

.prose-sm :where(img):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  margin-top: 1.7142857em;
  margin-bottom: 1.7142857em;
}

.prose-sm :where(picture):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  margin-top: 1.7142857em;
  margin-bottom: 1.7142857em;
}

.prose-sm :where(picture > img):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  margin-top: 0;
  margin-bottom: 0;
}

.prose-sm :where(video):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  margin-top: 1.7142857em;
  margin-bottom: 1.7142857em;
}

.prose-sm :where(kbd):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  font-size: 0.8571429em;
  border-radius: 0.3125rem;
  padding-top: 0.1428571em;
  padding-inline-end: 0.3571429em;
  padding-bottom: 0.1428571em;
  padding-inline-start: 0.3571429em;
}

.prose-sm :where(code):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  font-size: 0.8571429em;
}

.prose-sm :where(h2 code):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  font-size: 0.9em;
}

.prose-sm :where(h3 code):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  font-size: 0.8888889em;
}

.prose-sm :where(pre):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  font-size: 0.8571429em;
  line-height: 1.6666667;
  margin-top: 1.6666667em;
  margin-bottom: 1.6666667em;
  border-radius: 0.25rem;
  padding-top: 0.6666667em;
  padding-inline-end: 1em;
  padding-bottom: 0.6666667em;
  padding-inline-start: 1em;
}

.prose-sm :where(ol):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  margin-top: 1.1428571em;
  margin-bottom: 1.1428571em;
  padding-inline-start: 1.5714286em;
}

.prose-sm :where(ul):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  margin-top: 1.1428571em;
  margin-bottom: 1.1428571em;
  padding-inline-start: 1.5714286em;
}

.prose-sm :where(li):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  margin-top: 0.2857143em;
  margin-bottom: 0.2857143em;
}

.prose-sm :where(ol > li):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  padding-inline-start: 0.4285714em;
}

.prose-sm :where(ul > li):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  padding-inline-start: 0.4285714em;
}

.prose-sm :where(.prose-sm > ul > li p):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  margin-top: 0.5714286em;
  margin-bottom: 0.5714286em;
}

.prose-sm :where(.prose-sm > ul > li > p:first-child):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  margin-top: 1.1428571em;
}

.prose-sm :where(.prose-sm > ul > li > p:last-child):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  margin-bottom: 1.1428571em;
}

.prose-sm :where(.prose-sm > ol > li > p:first-child):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  margin-top: 1.1428571em;
}

.prose-sm :where(.prose-sm > ol > li > p:last-child):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  margin-bottom: 1.1428571em;
}

.prose-sm :where(ul ul, ul ol, ol ul, ol ol):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  margin-top: 0.5714286em;
  margin-bottom: 0.5714286em;
}

.prose-sm :where(dl):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  margin-top: 1.1428571em;
  margin-bottom: 1.1428571em;
}

.prose-sm :where(dt):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  margin-top: 1.1428571em;
}

.prose-sm :where(dd):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  margin-top: 0.2857143em;
  padding-inline-start: 1.5714286em;
}

.prose-sm :where(hr):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  margin-top: 2.8571429em;
  margin-bottom: 2.8571429em;
}

.prose-sm :where(hr + *):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  margin-top: 0;
}

.prose-sm :where(h2 + *):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  margin-top: 0;
}

.prose-sm :where(h3 + *):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  margin-top: 0;
}

.prose-sm :where(h4 + *):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  margin-top: 0;
}

.prose-sm :where(table):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  font-size: 0.8571429em;
  line-height: 1.5;
}

.prose-sm :where(thead th):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  padding-inline-end: 1em;
  padding-bottom: 0.6666667em;
  padding-inline-start: 1em;
}

.prose-sm :where(thead th:first-child):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  padding-inline-start: 0;
}

.prose-sm :where(thead th:last-child):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  padding-inline-end: 0;
}

.prose-sm :where(tbody td, tfoot td):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  padding-top: 0.6666667em;
  padding-inline-end: 1em;
  padding-bottom: 0.6666667em;
  padding-inline-start: 1em;
}

.prose-sm :where(tbody td:first-child, tfoot td:first-child):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  padding-inline-start: 0;
}

.prose-sm :where(tbody td:last-child, tfoot td:last-child):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  padding-inline-end: 0;
}

.prose-sm :where(figure):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  margin-top: 1.7142857em;
  margin-bottom: 1.7142857em;
}

.prose-sm :where(figure > *):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  margin-top: 0;
  margin-bottom: 0;
}

.prose-sm :where(figcaption):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  font-size: 0.8571429em;
  line-height: 1.3333333;
  margin-top: 0.6666667em;
}

.prose-sm :where(.prose-sm > :first-child):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  margin-top: 0;
}

.prose-sm :where(.prose-sm > :last-child):not(:where([class~="not-prose"],[class~="not-prose"] *)){
  margin-bottom: 0;
}

.prose-gray{
  --tw-prose-body: #374151;
  --tw-prose-headings: #111827;
  --tw-prose-lead: #4b5563;
  --tw-prose-links: #111827;
  --tw-prose-bold: #111827;
  --tw-prose-counters: #6b7280;
  --tw-prose-bullets: #d1d5db;
  --tw-prose-hr: #e5e7eb;
  --tw-prose-quotes: #111827;
  --tw-prose-quote-borders: #e5e7eb;
  --tw-prose-captions: #6b7280;
  --tw-prose-kbd: #111827;
  --tw-prose-kbd-shadows: rgb(17 24 39 / 10%);
  --tw-prose-code: #111827;
  --tw-prose-pre-code: #e5e7eb;
  --tw-prose-pre-bg: #1f2937;
  --tw-prose-th-borders: #d1d5db;
  --tw-prose-td-borders: #e5e7eb;
  --tw-prose-invert-body: #d1d5db;
  --tw-prose-invert-headings: #fff;
  --tw-prose-invert-lead: #9ca3af;
  --tw-prose-invert-links: #fff;
  --tw-prose-invert-bold: #fff;
  --tw-prose-invert-counters: #9ca3af;
  --tw-prose-invert-bullets: #4b5563;
  --tw-prose-invert-hr: #374151;
  --tw-prose-invert-quotes: #f3f4f6;
  --tw-prose-invert-quote-borders: #374151;
  --tw-prose-invert-captions: #9ca3af;
  --tw-prose-invert-kbd: #fff;
  --tw-prose-invert-kbd-shadows: rgb(255 255 255 / 10%);
  --tw-prose-invert-code: #fff;
  --tw-prose-invert-pre-code: #d1d5db;
  --tw-prose-invert-pre-bg: rgb(0 0 0 / 50%);
  --tw-prose-invert-th-borders: #4b5563;
  --tw-prose-invert-td-borders: #374151;
}

header-menu {
  display: block;
  position: static;
}

.mega-menu {
  position: static;
}

.mega-menu > summary {
  list-style: none;
  cursor: pointer;
}

.mega-menu > summary::-webkit-details-marker {
  display: none;
}

.mega-menu .mega-menu__content {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 50;
  width: 100%;
  background-color: var(--navbar-bg, var(--background));
  box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.mega-menu .page-width {
  max-width: 1280px;
  margin-left: auto;
  margin-right: auto;
  padding-left: 1rem;
  padding-right: 1rem;
}

@media (min-width: 640px) {
  .mega-menu .page-width {
    padding-left: 1.5rem;
    padding-right: 1.5rem;
  }
}

@media (min-width: 1024px) {
  .mega-menu .page-width {
    padding-left: 2rem;
    padding-right: 2rem;
  }
}

.mega-menu .overflow-x-auto {
  scrollbar-width: thin;
  scrollbar-color: var(--muted-foreground) var(--muted);
}

.mega-menu .overflow-x-auto::-webkit-scrollbar {
  height: 6px;
}

.mega-menu .overflow-x-auto::-webkit-scrollbar-track {
  background: var(--muted);
  border-radius: 3px;
}

.mega-menu .overflow-x-auto::-webkit-scrollbar-thumb {
  background: var(--muted-foreground);
  border-radius: 3px;
}

.mega-menu__link--level-2 {
  font-weight: 600;
  display: block;
  margin-bottom: 0.75rem;
}

.list-unstyled {
  list-style: none;
  padding-left: 0;
}

.mega-menu > summary .icon-caret {
  transition: transform var(--transition-duration-200, 200ms) var(--transition-timing-ease, ease);
}

.mega-menu[open] > summary .icon-caret {
  transform: rotate(180deg);
}

.sr-only{
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

.pointer-events-none{
  pointer-events: none;
}

.\\!visible{
  visibility: visible !important;
}

.visible{
  visibility: visible;
}

.collapse{
  visibility: collapse;
}

.static{
  position: static;
}

.fixed{
  position: fixed;
}

.absolute{
  position: absolute;
}

.relative{
  position: relative;
}

.sticky{
  position: sticky;
}

.inset-0{
  inset: 0px;
}

.inset-y-0{
  top: 0px;
  bottom: 0px;
}

.-bottom-0{
  bottom: -0px;
}

.-bottom-0\\.5{
  bottom: -0.125rem;
}

.-right-2{
  right: -0.5rem;
}

.-top-0{
  top: -0px;
}

.-top-0\\.5{
  top: -0.125rem;
}

.-top-10{
  top: -2.5rem;
}

.-top-2{
  top: -0.5rem;
}

.-top-3{
  top: -0.75rem;
}

.bottom-0{
  bottom: 0px;
}

.bottom-1{
  bottom: 0.25rem;
}

.bottom-2{
  bottom: 0.5rem;
}

.bottom-20{
  bottom: 5rem;
}

.bottom-4{
  bottom: 1rem;
}

.bottom-6{
  bottom: 1.5rem;
}

.bottom-8{
  bottom: 2rem;
}

.bottom-full{
  bottom: 100%;
}

.left-0{
  left: 0px;
}

.left-1{
  left: 0.25rem;
}

.left-1\\/2{
  left: 50%;
}

.left-2{
  left: 0.5rem;
}

.left-2\\.5{
  left: 0.625rem;
}

.left-3{
  left: 0.75rem;
}

.left-4{
  left: 1rem;
}

.left-full{
  left: 100%;
}

.right-0{
  right: 0px;
}

.right-1{
  right: 0.25rem;
}

.right-1\\/2{
  right: 50%;
}

.right-2{
  right: 0.5rem;
}

.right-2\\.5{
  right: 0.625rem;
}

.right-3{
  right: 0.75rem;
}

.right-4{
  right: 1rem;
}

.right-6{
  right: 1.5rem;
}

.right-8{
  right: 2rem;
}

.right-full{
  right: 100%;
}

.top-0{
  top: 0px;
}

.top-1{
  top: 0.25rem;
}

.top-1\\/2{
  top: 50%;
}

.top-16{
  top: 4rem;
}

.top-2{
  top: 0.5rem;
}

.top-2\\.5{
  top: 0.625rem;
}

.top-20{
  top: 5rem;
}

.top-24{
  top: 6rem;
}

.top-3{
  top: 0.75rem;
}

.top-4{
  top: 1rem;
}

.top-6{
  top: 1.5rem;
}

.top-8{
  top: 2rem;
}

.top-full{
  top: 100%;
}

.isolate{
  isolation: isolate;
}

.z-0{
  z-index: 0;
}

.z-10{
  z-index: 10;
}

.z-20{
  z-index: 20;
}

.z-30{
  z-index: 30;
}

.z-50{
  z-index: 50;
}

.z-\\[10000\\]{
  z-index: 10000;
}

.z-\\[100\\]{
  z-index: 100;
}

.z-\\[60\\]{
  z-index: 60;
}

.z-\\[9999\\]{
  z-index: 9999;
}

.order-1{
  order: 1;
}

.order-2{
  order: 2;
}

.col-span-1{
  grid-column: span 1 / span 1;
}

.col-span-12{
  grid-column: span 12 / span 12;
}

.col-span-2{
  grid-column: span 2 / span 2;
}

.col-span-3{
  grid-column: span 3 / span 3;
}

.col-span-4{
  grid-column: span 4 / span 4;
}

.col-span-6{
  grid-column: span 6 / span 6;
}

.col-span-full{
  grid-column: 1 / -1;
}

.col-start-2{
  grid-column-start: 2;
}

.row-span-2{
  grid-row: span 2 / span 2;
}

.row-start-1{
  grid-row-start: 1;
}

.row-start-2{
  grid-row-start: 2;
}

.row-start-3{
  grid-row-start: 3;
}

.float-right{
  float: right;
}

.-mx-1{
  margin-left: -0.25rem;
  margin-right: -0.25rem;
}

.-mx-4{
  margin-left: -1rem;
  margin-right: -1rem;
}

.mx-0{
  margin-left: 0px;
  margin-right: 0px;
}

.mx-1{
  margin-left: 0.25rem;
  margin-right: 0.25rem;
}

.mx-2{
  margin-left: 0.5rem;
  margin-right: 0.5rem;
}

.mx-4{
  margin-left: 1rem;
  margin-right: 1rem;
}

.mx-5{
  margin-left: 1.25rem;
  margin-right: 1.25rem;
}

.mx-6{
  margin-left: 1.5rem;
  margin-right: 1.5rem;
}

.mx-auto{
  margin-left: auto;
  margin-right: auto;
}

.my-1{
  margin-top: 0.25rem;
  margin-bottom: 0.25rem;
}

.my-2{
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
}

.my-3{
  margin-top: 0.75rem;
  margin-bottom: 0.75rem;
}

.my-4{
  margin-top: 1rem;
  margin-bottom: 1rem;
}

.my-6{
  margin-top: 1.5rem;
  margin-bottom: 1.5rem;
}

.my-8{
  margin-top: 2rem;
  margin-bottom: 2rem;
}

.-mb-4{
  margin-bottom: -1rem;
}

.-mb-\\[1px\\]{
  margin-bottom: -1px;
}

.-mb-px{
  margin-bottom: -1px;
}

.-ml-4{
  margin-left: -1rem;
}

.-ml-\\[50vw\\]{
  margin-left: -50vw;
}

.-mr-4{
  margin-right: -1rem;
}

.-mt-1{
  margin-top: -0.25rem;
}

.mb-0{
  margin-bottom: 0px;
}

.mb-0\\.5{
  margin-bottom: 0.125rem;
}

.mb-1{
  margin-bottom: 0.25rem;
}

.mb-10{
  margin-bottom: 2.5rem;
}

.mb-12{
  margin-bottom: 3rem;
}

.mb-2{
  margin-bottom: 0.5rem;
}

.mb-3{
  margin-bottom: 0.75rem;
}

.mb-4{
  margin-bottom: 1rem;
}

.mb-5{
  margin-bottom: 1.25rem;
}

.mb-6{
  margin-bottom: 1.5rem;
}

.mb-8{
  margin-bottom: 2rem;
}

.ml-0{
  margin-left: 0px;
}

.ml-0\\.5{
  margin-left: 0.125rem;
}

.ml-1{
  margin-left: 0.25rem;
}

.ml-10{
  margin-left: 2.5rem;
}

.ml-2{
  margin-left: 0.5rem;
}

.ml-3{
  margin-left: 0.75rem;
}

.ml-4{
  margin-left: 1rem;
}

.ml-6{
  margin-left: 1.5rem;
}

.ml-8{
  margin-left: 2rem;
}

.ml-auto{
  margin-left: auto;
}

.mr-0{
  margin-right: 0px;
}

.mr-1{
  margin-right: 0.25rem;
}

.mr-2{
  margin-right: 0.5rem;
}

.mr-3{
  margin-right: 0.75rem;
}

.mr-4{
  margin-right: 1rem;
}

.mr-\\[50vw\\]{
  margin-right: 50vw;
}

.mr-auto{
  margin-right: auto;
}

.mt-0{
  margin-top: 0px;
}

.mt-0\\.5{
  margin-top: 0.125rem;
}

.mt-1{
  margin-top: 0.25rem;
}

.mt-10{
  margin-top: 2.5rem;
}

.mt-12{
  margin-top: 3rem;
}

.mt-2{
  margin-top: 0.5rem;
}

.mt-3{
  margin-top: 0.75rem;
}

.mt-4{
  margin-top: 1rem;
}

.mt-6{
  margin-top: 1.5rem;
}

.mt-8{
  margin-top: 2rem;
}

.box-border{
  box-sizing: border-box;
}

.line-clamp-1{
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
}

.line-clamp-2{
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.line-clamp-3{
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.line-clamp-4{
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
}

.block{
  display: block;
}

.inline-block{
  display: inline-block;
}

.inline{
  display: inline;
}

.flex{
  display: flex;
}

.inline-flex{
  display: inline-flex;
}

.table{
  display: table;
}

.table-caption{
  display: table-caption;
}

.table-cell{
  display: table-cell;
}

.table-row{
  display: table-row;
}

.grid{
  display: grid;
}

.contents{
  display: contents;
}

.list-item{
  display: list-item;
}

.hidden{
  display: none;
}

.aspect-\\[4\\/5\\]{
  aspect-ratio: 4/5;
}

.aspect-square{
  aspect-ratio: 1 / 1;
}

.aspect-video{
  aspect-ratio: 16 / 9;
}

.size-3{
  width: 0.75rem;
  height: 0.75rem;
}

.size-3\\.5{
  width: 0.875rem;
  height: 0.875rem;
}

.size-4{
  width: 1rem;
  height: 1rem;
}

.size-6{
  width: 1.5rem;
  height: 1.5rem;
}

.size-7{
  width: 1.75rem;
  height: 1.75rem;
}

.size-8{
  width: 2rem;
  height: 2rem;
}

.size-9{
  width: 2.25rem;
  height: 2.25rem;
}

.h-0{
  height: 0px;
}

.h-0\\.5{
  height: 0.125rem;
}

.h-1{
  height: 0.25rem;
}

.h-1\\.5{
  height: 0.375rem;
}

.h-10{
  height: 2.5rem;
}

.h-12{
  height: 3rem;
}

.h-14{
  height: 3.5rem;
}

.h-16{
  height: 4rem;
}

.h-2{
  height: 0.5rem;
}

.h-2\\.5{
  height: 0.625rem;
}

.h-20{
  height: 5rem;
}

.h-24{
  height: 6rem;
}

.h-3{
  height: 0.75rem;
}

.h-3\\.5{
  height: 0.875rem;
}

.h-32{
  height: 8rem;
}

.h-4{
  height: 1rem;
}

.h-40{
  height: 10rem;
}

.h-48{
  height: 12rem;
}

.h-5{
  height: 1.25rem;
}

.h-56{
  height: 14rem;
}

.h-6{
  height: 1.5rem;
}

.h-64{
  height: 16rem;
}

.h-7{
  height: 1.75rem;
}

.h-8{
  height: 2rem;
}

.h-9{
  height: 2.25rem;
}

.h-96{
  height: 24rem;
}

.h-\\[10px\\]{
  height: 10px;
}

.h-\\[150px\\]{
  height: 150px;
}

.h-\\[200px\\]{
  height: 200px;
}

.h-\\[300px\\]{
  height: 300px;
}

.h-\\[400px\\]{
  height: 400px;
}

.h-\\[420px\\]{
  height: 420px;
}

.h-\\[50px\\]{
  height: 50px;
}

.h-\\[540px\\]{
  height: 540px;
}

.h-\\[600px\\]{
  height: 600px;
}

.h-\\[60vh\\]{
  height: 60vh;
}

.h-\\[70px\\]{
  height: 70px;
}

.h-\\[70vh\\]{
  height: 70vh;
}

.h-\\[85vh\\]{
  height: 85vh;
}

.h-\\[calc\\(100vh-100px\\)\\]{
  height: calc(100vh - 100px);
}

.h-\\[calc\\(100vh-120px\\)\\]{
  height: calc(100vh - 120px);
}

.h-auto{
  height: auto;
}

.h-full{
  height: 100%;
}

.h-px{
  height: 1px;
}

.h-screen{
  height: 100vh;
}

.max-h-32{
  max-height: 8rem;
}

.max-h-40{
  max-height: 10rem;
}

.max-h-48{
  max-height: 12rem;
}

.max-h-60{
  max-height: 15rem;
}

.max-h-64{
  max-height: 16rem;
}

.max-h-80{
  max-height: 20rem;
}

.max-h-96{
  max-height: 24rem;
}

.max-h-\\[150px\\]{
  max-height: 150px;
}

.max-h-\\[200px\\]{
  max-height: 200px;
}

.max-h-\\[300px\\]{
  max-height: 300px;
}

.max-h-\\[320px\\]{
  max-height: 320px;
}

.max-h-\\[400px\\]{
  max-height: 400px;
}

.max-h-\\[40vh\\]{
  max-height: 40vh;
}

.max-h-\\[500px\\]{
  max-height: 500px;
}

.max-h-\\[600px\\]{
  max-height: 600px;
}

.max-h-\\[70vh\\]{
  max-height: 70vh;
}

.max-h-\\[80vh\\]{
  max-height: 80vh;
}

.max-h-\\[85vh\\]{
  max-height: 85vh;
}

.max-h-\\[90vh\\]{
  max-height: 90vh;
}

.max-h-\\[calc\\(100vh-300px\\)\\]{
  max-height: calc(100vh - 300px);
}

.max-h-screen{
  max-height: 100vh;
}

.min-h-0{
  min-height: 0px;
}

.min-h-\\[300px\\]{
  min-height: 300px;
}

.min-h-\\[400px\\]{
  min-height: 400px;
}

.min-h-\\[60px\\]{
  min-height: 60px;
}

.min-h-\\[60vh\\]{
  min-height: 60vh;
}

.min-h-\\[70px\\]{
  min-height: 70px;
}

.min-h-full{
  min-height: 100%;
}

.min-h-screen{
  min-height: 100vh;
}

.w-0{
  width: 0px;
}

.w-1{
  width: 0.25rem;
}

.w-1\\.5{
  width: 0.375rem;
}

.w-1\\/2{
  width: 50%;
}

.w-1\\/3{
  width: 33.333333%;
}

.w-1\\/4{
  width: 25%;
}

.w-10{
  width: 2.5rem;
}

.w-11{
  width: 2.75rem;
}

.w-12{
  width: 3rem;
}

.w-14{
  width: 3.5rem;
}

.w-16{
  width: 4rem;
}

.w-2{
  width: 0.5rem;
}

.w-2\\/3{
  width: 66.666667%;
}

.w-20{
  width: 5rem;
}

.w-24{
  width: 6rem;
}

.w-28{
  width: 7rem;
}

.w-3{
  width: 0.75rem;
}

.w-3\\.5{
  width: 0.875rem;
}

.w-3\\/4{
  width: 75%;
}

.w-32{
  width: 8rem;
}

.w-4{
  width: 1rem;
}

.w-4\\/5{
  width: 80%;
}

.w-4\\/6{
  width: 66.666667%;
}

.w-40{
  width: 10rem;
}

.w-44{
  width: 11rem;
}

.w-48{
  width: 12rem;
}

.w-5{
  width: 1.25rem;
}

.w-5\\/6{
  width: 83.333333%;
}

.w-56{
  width: 14rem;
}

.w-6{
  width: 1.5rem;
}

.w-64{
  width: 16rem;
}

.w-7{
  width: 1.75rem;
}

.w-72{
  width: 18rem;
}

.w-8{
  width: 2rem;
}

.w-80{
  width: 20rem;
}

.w-96{
  width: 24rem;
}

.w-\\[10\\%\\]{
  width: 10%;
}

.w-\\[100px\\]{
  width: 100px;
}

.w-\\[120px\\]{
  width: 120px;
}

.w-\\[13\\%\\]{
  width: 13%;
}

.w-\\[130px\\]{
  width: 130px;
}

.w-\\[140px\\]{
  width: 140px;
}

.w-\\[15\\%\\]{
  width: 15%;
}

.w-\\[150px\\]{
  width: 150px;
}

.w-\\[17\\%\\]{
  width: 17%;
}

.w-\\[180px\\]{
  width: 180px;
}

.w-\\[20\\%\\]{
  width: 20%;
}

.w-\\[200px\\]{
  width: 200px;
}

.w-\\[35\\%\\]{
  width: 35%;
}

.w-\\[45\\%\\]{
  width: 45%;
}

.w-\\[50\\%\\]{
  width: 50%;
}

.w-\\[500px\\]{
  width: 500px;
}

.w-\\[550px\\]{
  width: 550px;
}

.w-\\[60\\%\\]{
  width: 60%;
}

.w-\\[600px\\]{
  width: 600px;
}

.w-\\[70\\%\\]{
  width: 70%;
}

.w-\\[700px\\]{
  width: 700px;
}

.w-\\[70px\\]{
  width: 70px;
}

.w-\\[750px\\]{
  width: 750px;
}

.w-\\[800px\\]{
  width: 800px;
}

.w-\\[80px\\]{
  width: 80px;
}

.w-\\[900px\\]{
  width: 900px;
}

.w-\\[90px\\]{
  width: 90px;
}

.w-auto{
  width: auto;
}

.w-fit{
  width: -moz-fit-content;
  width: fit-content;
}

.w-full{
  width: 100%;
}

.w-px{
  width: 1px;
}

.w-screen{
  width: 100vw;
}

.min-w-0{
  min-width: 0px;
}

.min-w-32{
  min-width: 8rem;
}

.min-w-36{
  min-width: 9rem;
}

.min-w-\\[120px\\]{
  min-width: 120px;
}

.min-w-\\[140px\\]{
  min-width: 140px;
}

.min-w-\\[150px\\]{
  min-width: 150px;
}

.min-w-\\[160px\\]{
  min-width: 160px;
}

.min-w-\\[180px\\]{
  min-width: 180px;
}

.min-w-\\[200px\\]{
  min-width: 200px;
}

.min-w-\\[40px\\]{
  min-width: 40px;
}

.min-w-\\[50px\\]{
  min-width: 50px;
}

.min-w-\\[600px\\]{
  min-width: 600px;
}

.min-w-\\[640px\\]{
  min-width: 640px;
}

.min-w-full{
  min-width: 100%;
}

.max-w-2xl{
  max-width: 42rem;
}

.max-w-32{
  max-width: 8rem;
}

.max-w-3xl{
  max-width: 48rem;
}

.max-w-4xl{
  max-width: 56rem;
}

.max-w-5xl{
  max-width: 64rem;
}

.max-w-6xl{
  max-width: 72rem;
}

.max-w-7xl{
  max-width: 80rem;
}

.max-w-\\[120px\\]{
  max-width: 120px;
}

.max-w-\\[150px\\]{
  max-width: 150px;
}

.max-w-\\[180px\\]{
  max-width: 180px;
}

.max-w-\\[200px\\]{
  max-width: 200px;
}

.max-w-\\[220px\\]{
  max-width: 220px;
}

.max-w-\\[350px\\]{
  max-width: 350px;
}

.max-w-\\[70\\%\\]{
  max-width: 70%;
}

.max-w-\\[75\\%\\]{
  max-width: 75%;
}

.max-w-\\[80\\%\\]{
  max-width: 80%;
}

.max-w-\\[90vw\\]{
  max-width: 90vw;
}

.max-w-\\[calc\\(100\\%-2rem\\)\\]{
  max-width: calc(100% - 2rem);
}

.max-w-full{
  max-width: 100%;
}

.max-w-lg{
  max-width: 32rem;
}

.max-w-md{
  max-width: 28rem;
}

.max-w-none{
  max-width: none;
}

.max-w-sm{
  max-width: 24rem;
}

.max-w-xl{
  max-width: 36rem;
}

.max-w-xs{
  max-width: 20rem;
}

.flex-1{
  flex: 1 1 0%;
}

.flex-none{
  flex: none;
}

.flex-shrink{
  flex-shrink: 1;
}

.flex-shrink-0{
  flex-shrink: 0;
}

.shrink-0{
  flex-shrink: 0;
}

.flex-grow{
  flex-grow: 1;
}

.table-fixed{
  table-layout: fixed;
}

.caption-bottom{
  caption-side: bottom;
}

.border-collapse{
  border-collapse: collapse;
}

.-translate-x-1{
  --tw-translate-x: -0.25rem;
  transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));
}

.-translate-x-1\\/2{
  --tw-translate-x: -50%;
  transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));
}

.-translate-x-full{
  --tw-translate-x: -100%;
  transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));
}

.-translate-y-1{
  --tw-translate-y: -0.25rem;
  transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));
}

.-translate-y-1\\/2{
  --tw-translate-y: -50%;
  transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));
}

.-translate-y-full{
  --tw-translate-y: -100%;
  transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));
}

.translate-x-0{
  --tw-translate-x: 0px;
  transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));
}

.translate-x-1{
  --tw-translate-x: 0.25rem;
  transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));
}

.translate-x-6{
  --tw-translate-x: 1.5rem;
  transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));
}

.translate-y-0{
  --tw-translate-y: 0px;
  transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));
}

.-rotate-90{
  --tw-rotate: -90deg;
  transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));
}

.rotate-180{
  --tw-rotate: 180deg;
  transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));
}

.rotate-45{
  --tw-rotate: 45deg;
  transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));
}

.rotate-90{
  --tw-rotate: 90deg;
  transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));
}

.scale-105{
  --tw-scale-x: 1.05;
  --tw-scale-y: 1.05;
  transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));
}

.scale-110{
  --tw-scale-x: 1.1;
  --tw-scale-y: 1.1;
  transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));
}

.transform{
  transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));
}

@keyframes pulse{
  50%{
    opacity: .5;
  }
}

.animate-pulse{
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes spin{
  to{
    transform: rotate(360deg);
  }
}

.animate-spin{
  animation: spin 1s linear infinite;
}

.cursor-default{
  cursor: default;
}

.cursor-grab{
  cursor: grab;
}

.cursor-help{
  cursor: help;
}

.cursor-move{
  cursor: move;
}

.cursor-not-allowed{
  cursor: not-allowed;
}

.cursor-pointer{
  cursor: pointer;
}

.cursor-wait{
  cursor: wait;
}

.select-none{
  -webkit-user-select: none;
     -moz-user-select: none;
          user-select: none;
}

.select-all{
  -webkit-user-select: all;
     -moz-user-select: all;
          user-select: all;
}

.resize-none{
  resize: none;
}

.resize-y{
  resize: vertical;
}

.resize{
  resize: both;
}

.scroll-my-1{
  scroll-margin-top: 0.25rem;
  scroll-margin-bottom: 0.25rem;
}

.list-inside{
  list-style-position: inside;
}

.list-decimal{
  list-style-type: decimal;
}

.list-disc{
  list-style-type: disc;
}

.list-none{
  list-style-type: none;
}

.appearance-none{
  -webkit-appearance: none;
     -moz-appearance: none;
          appearance: none;
}

.grid-flow-col{
  grid-auto-flow: column;
}

.auto-rows-fr{
  grid-auto-rows: minmax(0, 1fr);
}

.auto-rows-min{
  grid-auto-rows: min-content;
}

.grid-cols-1{
  grid-template-columns: repeat(1, minmax(0, 1fr));
}

.grid-cols-12{
  grid-template-columns: repeat(12, minmax(0, 1fr));
}

.grid-cols-2{
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.grid-cols-3{
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.grid-cols-4{
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.grid-cols-5{
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.grid-cols-6{
  grid-template-columns: repeat(6, minmax(0, 1fr));
}

.grid-cols-\\[2fr_2fr_1fr\\]{
  grid-template-columns: 2fr 2fr 1fr;
}

.grid-cols-\\[repeat\\(auto-fit\\2c minmax\\(120px\\2c 1fr\\)\\)\\]{
  grid-template-columns: repeat(auto-fit,minmax(120px,1fr));
}

.grid-rows-\\[20px_1fr_20px\\]{
  grid-template-rows: 20px 1fr 20px;
}

.flex-row{
  flex-direction: row;
}

.flex-row-reverse{
  flex-direction: row-reverse;
}

.flex-col{
  flex-direction: column;
}

.flex-col-reverse{
  flex-direction: column-reverse;
}

.flex-wrap{
  flex-wrap: wrap;
}

.flex-nowrap{
  flex-wrap: nowrap;
}

.items-start{
  align-items: flex-start;
}

.items-end{
  align-items: flex-end;
}

.items-center{
  align-items: center;
}

.items-stretch{
  align-items: stretch;
}

.justify-start{
  justify-content: flex-start;
}

.justify-end{
  justify-content: flex-end;
}

.justify-center{
  justify-content: center;
}

.justify-between{
  justify-content: space-between;
}

.justify-items-center{
  justify-items: center;
}

.gap-0{
  gap: 0px;
}

.gap-0\\.5{
  gap: 0.125rem;
}

.gap-1{
  gap: 0.25rem;
}

.gap-1\\.5{
  gap: 0.375rem;
}

.gap-10{
  gap: 2.5rem;
}

.gap-16{
  gap: 4rem;
}

.gap-2{
  gap: 0.5rem;
}

.gap-3{
  gap: 0.75rem;
}

.gap-4{
  gap: 1rem;
}

.gap-6{
  gap: 1.5rem;
}

.gap-8{
  gap: 2rem;
}

.gap-\\[24px\\]{
  gap: 24px;
}

.gap-\\[32px\\]{
  gap: 32px;
}

.gap-x-12{
  -moz-column-gap: 3rem;
       column-gap: 3rem;
}

.gap-x-16{
  -moz-column-gap: 4rem;
       column-gap: 4rem;
}

.gap-x-4{
  -moz-column-gap: 1rem;
       column-gap: 1rem;
}

.gap-x-6{
  -moz-column-gap: 1.5rem;
       column-gap: 1.5rem;
}

.gap-x-8{
  -moz-column-gap: 2rem;
       column-gap: 2rem;
}

.gap-y-2{
  row-gap: 0.5rem;
}

.gap-y-3{
  row-gap: 0.75rem;
}

.gap-y-4{
  row-gap: 1rem;
}

.space-x-1 > :not([hidden]) ~ :not([hidden]){
  --tw-space-x-reverse: 0;
  margin-right: calc(0.25rem * var(--tw-space-x-reverse));
  margin-left: calc(0.25rem * calc(1 - var(--tw-space-x-reverse)));
}

.space-x-2 > :not([hidden]) ~ :not([hidden]){
  --tw-space-x-reverse: 0;
  margin-right: calc(0.5rem * var(--tw-space-x-reverse));
  margin-left: calc(0.5rem * calc(1 - var(--tw-space-x-reverse)));
}

.space-x-3 > :not([hidden]) ~ :not([hidden]){
  --tw-space-x-reverse: 0;
  margin-right: calc(0.75rem * var(--tw-space-x-reverse));
  margin-left: calc(0.75rem * calc(1 - var(--tw-space-x-reverse)));
}

.space-x-4 > :not([hidden]) ~ :not([hidden]){
  --tw-space-x-reverse: 0;
  margin-right: calc(1rem * var(--tw-space-x-reverse));
  margin-left: calc(1rem * calc(1 - var(--tw-space-x-reverse)));
}

.space-x-6 > :not([hidden]) ~ :not([hidden]){
  --tw-space-x-reverse: 0;
  margin-right: calc(1.5rem * var(--tw-space-x-reverse));
  margin-left: calc(1.5rem * calc(1 - var(--tw-space-x-reverse)));
}

.space-x-8 > :not([hidden]) ~ :not([hidden]){
  --tw-space-x-reverse: 0;
  margin-right: calc(2rem * var(--tw-space-x-reverse));
  margin-left: calc(2rem * calc(1 - var(--tw-space-x-reverse)));
}

.space-y-0 > :not([hidden]) ~ :not([hidden]){
  --tw-space-y-reverse: 0;
  margin-top: calc(0px * calc(1 - var(--tw-space-y-reverse)));
  margin-bottom: calc(0px * var(--tw-space-y-reverse));
}

.space-y-0\\.5 > :not([hidden]) ~ :not([hidden]){
  --tw-space-y-reverse: 0;
  margin-top: calc(0.125rem * calc(1 - var(--tw-space-y-reverse)));
  margin-bottom: calc(0.125rem * var(--tw-space-y-reverse));
}

.space-y-1 > :not([hidden]) ~ :not([hidden]){
  --tw-space-y-reverse: 0;
  margin-top: calc(0.25rem * calc(1 - var(--tw-space-y-reverse)));
  margin-bottom: calc(0.25rem * var(--tw-space-y-reverse));
}

.space-y-1\\.5 > :not([hidden]) ~ :not([hidden]){
  --tw-space-y-reverse: 0;
  margin-top: calc(0.375rem * calc(1 - var(--tw-space-y-reverse)));
  margin-bottom: calc(0.375rem * var(--tw-space-y-reverse));
}

.space-y-2 > :not([hidden]) ~ :not([hidden]){
  --tw-space-y-reverse: 0;
  margin-top: calc(0.5rem * calc(1 - var(--tw-space-y-reverse)));
  margin-bottom: calc(0.5rem * var(--tw-space-y-reverse));
}

.space-y-3 > :not([hidden]) ~ :not([hidden]){
  --tw-space-y-reverse: 0;
  margin-top: calc(0.75rem * calc(1 - var(--tw-space-y-reverse)));
  margin-bottom: calc(0.75rem * var(--tw-space-y-reverse));
}

.space-y-4 > :not([hidden]) ~ :not([hidden]){
  --tw-space-y-reverse: 0;
  margin-top: calc(1rem * calc(1 - var(--tw-space-y-reverse)));
  margin-bottom: calc(1rem * var(--tw-space-y-reverse));
}

.space-y-5 > :not([hidden]) ~ :not([hidden]){
  --tw-space-y-reverse: 0;
  margin-top: calc(1.25rem * calc(1 - var(--tw-space-y-reverse)));
  margin-bottom: calc(1.25rem * var(--tw-space-y-reverse));
}

.space-y-6 > :not([hidden]) ~ :not([hidden]){
  --tw-space-y-reverse: 0;
  margin-top: calc(1.5rem * calc(1 - var(--tw-space-y-reverse)));
  margin-bottom: calc(1.5rem * var(--tw-space-y-reverse));
}

.space-y-8 > :not([hidden]) ~ :not([hidden]){
  --tw-space-y-reverse: 0;
  margin-top: calc(2rem * calc(1 - var(--tw-space-y-reverse)));
  margin-bottom: calc(2rem * var(--tw-space-y-reverse));
}

.divide-y > :not([hidden]) ~ :not([hidden]){
  --tw-divide-y-reverse: 0;
  border-top-width: calc(1px * calc(1 - var(--tw-divide-y-reverse)));
  border-bottom-width: calc(1px * var(--tw-divide-y-reverse));
}

.divide-gray-100 > :not([hidden]) ~ :not([hidden]){
  --tw-divide-opacity: 1;
  border-color: rgb(243 244 246 / var(--tw-divide-opacity, 1));
}

.divide-gray-200 > :not([hidden]) ~ :not([hidden]){
  --tw-divide-opacity: 1;
  border-color: rgb(229 231 235 / var(--tw-divide-opacity, 1));
}

.self-start{
  align-self: flex-start;
}

.self-end{
  align-self: flex-end;
}

.justify-self-end{
  justify-self: end;
}

.overflow-auto{
  overflow: auto;
}

.overflow-hidden{
  overflow: hidden;
}

.overflow-visible{
  overflow: visible;
}

.overflow-x-auto{
  overflow-x: auto;
}

.overflow-y-auto{
  overflow-y: auto;
}

.overflow-x-hidden{
  overflow-x: hidden;
}

.scroll-smooth{
  scroll-behavior: smooth;
}

.truncate{
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.whitespace-nowrap{
  white-space: nowrap;
}

.whitespace-pre-wrap{
  white-space: pre-wrap;
}

.break-words{
  overflow-wrap: break-word;
}

.break-all{
  word-break: break-all;
}

.rounded{
  border-radius: 0.25rem;
}

.rounded-\\[min\\(var\\(--radius-md\\)\\2c 10px\\)\\]{
  border-radius: min(var(--radius-md), 10px);
}

.rounded-\\[min\\(var\\(--radius-md\\)\\2c 12px\\)\\]{
  border-radius: min(var(--radius-md), 12px);
}

.rounded-full{
  border-radius: 9999px;
}

.rounded-lg{
  border-radius: var(--radius);
}

.rounded-md{
  border-radius: calc(var(--radius) - 2px);
}

.rounded-sm{
  border-radius: calc(var(--radius) - 4px);
}

.rounded-xl{
  border-radius: 0.75rem;
}

.rounded-b-2xl{
  border-bottom-right-radius: 1rem;
  border-bottom-left-radius: 1rem;
}

.rounded-b-lg{
  border-bottom-right-radius: var(--radius);
  border-bottom-left-radius: var(--radius);
}

.rounded-b-xl{
  border-bottom-right-radius: 0.75rem;
  border-bottom-left-radius: 0.75rem;
}

.rounded-l{
  border-top-left-radius: 0.25rem;
  border-bottom-left-radius: 0.25rem;
}

.rounded-l-lg{
  border-top-left-radius: var(--radius);
  border-bottom-left-radius: var(--radius);
}

.rounded-l-md{
  border-top-left-radius: calc(var(--radius) - 2px);
  border-bottom-left-radius: calc(var(--radius) - 2px);
}

.rounded-r{
  border-top-right-radius: 0.25rem;
  border-bottom-right-radius: 0.25rem;
}

.rounded-r-lg{
  border-top-right-radius: var(--radius);
  border-bottom-right-radius: var(--radius);
}

.rounded-r-md{
  border-top-right-radius: calc(var(--radius) - 2px);
  border-bottom-right-radius: calc(var(--radius) - 2px);
}

.rounded-t-lg{
  border-top-left-radius: var(--radius);
  border-top-right-radius: var(--radius);
}

.rounded-t-md{
  border-top-left-radius: calc(var(--radius) - 2px);
  border-top-right-radius: calc(var(--radius) - 2px);
}

.rounded-t-xl{
  border-top-left-radius: 0.75rem;
  border-top-right-radius: 0.75rem;
}

.border{
  border-width: 1px;
}

.border-0{
  border-width: 0px;
}

.border-2{
  border-width: 2px;
}

.border-4{
  border-width: 4px;
}

.border-y-8{
  border-top-width: 8px;
  border-bottom-width: 8px;
}

.border-b{
  border-bottom-width: 1px;
}

.border-b-0{
  border-bottom-width: 0px;
}

.border-b-2{
  border-bottom-width: 2px;
}

.border-l{
  border-left-width: 1px;
}

.border-l-2{
  border-left-width: 2px;
}

.border-l-4{
  border-left-width: 4px;
}

.border-r{
  border-right-width: 1px;
}

.border-r-0{
  border-right-width: 0px;
}

.border-r-4{
  border-right-width: 4px;
}

.border-t{
  border-top-width: 1px;
}

.border-t-0{
  border-top-width: 0px;
}

.border-solid{
  border-style: solid;
}

.border-dashed{
  border-style: dashed;
}

.border-none{
  border-style: none;
}

.border-amber-200{
  --tw-border-opacity: 1;
  border-color: rgb(253 230 138 / var(--tw-border-opacity, 1));
}

.border-black{
  --tw-border-opacity: 1;
  border-color: rgb(0 0 0 / var(--tw-border-opacity, 1));
}

.border-black\\/\\[\\.08\\]{
  border-color: rgb(0 0 0 / .08);
}

.border-blue-100{
  --tw-border-opacity: 1;
  border-color: rgb(219 234 254 / var(--tw-border-opacity, 1));
}

.border-blue-200{
  --tw-border-opacity: 1;
  border-color: rgb(191 219 254 / var(--tw-border-opacity, 1));
}

.border-blue-300{
  --tw-border-opacity: 1;
  border-color: rgb(147 197 253 / var(--tw-border-opacity, 1));
}

.border-blue-400{
  --tw-border-opacity: 1;
  border-color: rgb(96 165 250 / var(--tw-border-opacity, 1));
}

.border-blue-500{
  --tw-border-opacity: 1;
  border-color: rgb(59 130 246 / var(--tw-border-opacity, 1));
}

.border-blue-600{
  --tw-border-opacity: 1;
  border-color: rgb(37 99 235 / var(--tw-border-opacity, 1));
}

.border-border{
  border-color: var(--border);
}

.border-destructive{
  border-color: var(--destructive);
}

.border-emerald-200{
  --tw-border-opacity: 1;
  border-color: rgb(167 243 208 / var(--tw-border-opacity, 1));
}

.border-gray-100{
  --tw-border-opacity: 1;
  border-color: rgb(243 244 246 / var(--tw-border-opacity, 1));
}

.border-gray-200{
  --tw-border-opacity: 1;
  border-color: rgb(229 231 235 / var(--tw-border-opacity, 1));
}

.border-gray-300{
  --tw-border-opacity: 1;
  border-color: rgb(209 213 219 / var(--tw-border-opacity, 1));
}

.border-gray-50{
  --tw-border-opacity: 1;
  border-color: rgb(249 250 251 / var(--tw-border-opacity, 1));
}

.border-green-200{
  --tw-border-opacity: 1;
  border-color: rgb(187 247 208 / var(--tw-border-opacity, 1));
}

.border-green-300{
  --tw-border-opacity: 1;
  border-color: rgb(134 239 172 / var(--tw-border-opacity, 1));
}

.border-green-500{
  --tw-border-opacity: 1;
  border-color: rgb(34 197 94 / var(--tw-border-opacity, 1));
}

.border-indigo-300{
  --tw-border-opacity: 1;
  border-color: rgb(165 180 252 / var(--tw-border-opacity, 1));
}

.border-input{
  border-color: var(--input);
}

.border-orange-300{
  --tw-border-opacity: 1;
  border-color: rgb(253 186 116 / var(--tw-border-opacity, 1));
}

.border-orange-600{
  --tw-border-opacity: 1;
  border-color: rgb(234 88 12 / var(--tw-border-opacity, 1));
}

.border-primary{
  border-color: var(--primary);
}

.border-purple-200{
  --tw-border-opacity: 1;
  border-color: rgb(233 213 255 / var(--tw-border-opacity, 1));
}

.border-purple-300{
  --tw-border-opacity: 1;
  border-color: rgb(216 180 254 / var(--tw-border-opacity, 1));
}

.border-red-200{
  --tw-border-opacity: 1;
  border-color: rgb(254 202 202 / var(--tw-border-opacity, 1));
}

.border-red-300{
  --tw-border-opacity: 1;
  border-color: rgb(252 165 165 / var(--tw-border-opacity, 1));
}

.border-red-500{
  --tw-border-opacity: 1;
  border-color: rgb(239 68 68 / var(--tw-border-opacity, 1));
}

.border-transparent{
  border-color: transparent;
}

.border-white{
  --tw-border-opacity: 1;
  border-color: rgb(255 255 255 / var(--tw-border-opacity, 1));
}

.border-white\\/20{
  border-color: rgb(255 255 255 / 0.2);
}

.border-yellow-200{
  --tw-border-opacity: 1;
  border-color: rgb(254 240 138 / var(--tw-border-opacity, 1));
}

.border-yellow-300{
  --tw-border-opacity: 1;
  border-color: rgb(253 224 71 / var(--tw-border-opacity, 1));
}

.border-yellow-400{
  --tw-border-opacity: 1;
  border-color: rgb(250 204 21 / var(--tw-border-opacity, 1));
}

.border-yellow-500{
  --tw-border-opacity: 1;
  border-color: rgb(234 179 8 / var(--tw-border-opacity, 1));
}

.border-yellow-600{
  --tw-border-opacity: 1;
  border-color: rgb(202 138 4 / var(--tw-border-opacity, 1));
}

.border-y-transparent{
  border-top-color: transparent;
  border-bottom-color: transparent;
}

.border-l-blue-500{
  --tw-border-opacity: 1;
  border-left-color: rgb(59 130 246 / var(--tw-border-opacity, 1));
}

.border-l-primary{
  border-left-color: var(--primary);
}

.border-t-transparent{
  border-top-color: transparent;
}

.bg-\\[var\\(--navbar-bg\\2c var\\(--background\\2c \\#ffffff\\)\\)\\]{
  background-color: var(--navbar-bg,var(--background,#ffffff));
}

.bg-accent{
  background-color: var(--accent);
}

.bg-amber-50{
  --tw-bg-opacity: 1;
  background-color: rgb(255 251 235 / var(--tw-bg-opacity, 1));
}

.bg-background{
  background-color: var(--background);
}

.bg-black{
  --tw-bg-opacity: 1;
  background-color: rgb(0 0 0 / var(--tw-bg-opacity, 1));
}

.bg-black\\/0{
  background-color: rgb(0 0 0 / 0);
}

.bg-black\\/10{
  background-color: rgb(0 0 0 / 0.1);
}

.bg-black\\/20{
  background-color: rgb(0 0 0 / 0.2);
}

.bg-black\\/30{
  background-color: rgb(0 0 0 / 0.3);
}

.bg-black\\/40{
  background-color: rgb(0 0 0 / 0.4);
}

.bg-black\\/50{
  background-color: rgb(0 0 0 / 0.5);
}

.bg-black\\/60{
  background-color: rgb(0 0 0 / 0.6);
}

.bg-black\\/\\[\\.05\\]{
  background-color: rgb(0 0 0 / .05);
}

.bg-blue-100{
  --tw-bg-opacity: 1;
  background-color: rgb(219 234 254 / var(--tw-bg-opacity, 1));
}

.bg-blue-200{
  --tw-bg-opacity: 1;
  background-color: rgb(191 219 254 / var(--tw-bg-opacity, 1));
}

.bg-blue-300{
  --tw-bg-opacity: 1;
  background-color: rgb(147 197 253 / var(--tw-bg-opacity, 1));
}

.bg-blue-400{
  --tw-bg-opacity: 1;
  background-color: rgb(96 165 250 / var(--tw-bg-opacity, 1));
}

.bg-blue-50{
  --tw-bg-opacity: 1;
  background-color: rgb(239 246 255 / var(--tw-bg-opacity, 1));
}

.bg-blue-500{
  --tw-bg-opacity: 1;
  background-color: rgb(59 130 246 / var(--tw-bg-opacity, 1));
}

.bg-blue-600{
  --tw-bg-opacity: 1;
  background-color: rgb(37 99 235 / var(--tw-bg-opacity, 1));
}

.bg-border{
  background-color: var(--border);
}

.bg-card{
  background-color: var(--card);
}

.bg-destructive{
  background-color: var(--destructive);
}

.bg-emerald-100{
  --tw-bg-opacity: 1;
  background-color: rgb(209 250 229 / var(--tw-bg-opacity, 1));
}

.bg-emerald-500{
  --tw-bg-opacity: 1;
  background-color: rgb(16 185 129 / var(--tw-bg-opacity, 1));
}

.bg-foreground{
  background-color: var(--foreground);
}

.bg-gray-100{
  --tw-bg-opacity: 1;
  background-color: rgb(243 244 246 / var(--tw-bg-opacity, 1));
}

.bg-gray-200{
  --tw-bg-opacity: 1;
  background-color: rgb(229 231 235 / var(--tw-bg-opacity, 1));
}

.bg-gray-300{
  --tw-bg-opacity: 1;
  background-color: rgb(209 213 219 / var(--tw-bg-opacity, 1));
}

.bg-gray-400{
  --tw-bg-opacity: 1;
  background-color: rgb(156 163 175 / var(--tw-bg-opacity, 1));
}

.bg-gray-50{
  --tw-bg-opacity: 1;
  background-color: rgb(249 250 251 / var(--tw-bg-opacity, 1));
}

.bg-gray-50\\/50{
  background-color: rgb(249 250 251 / 0.5);
}

.bg-gray-500{
  --tw-bg-opacity: 1;
  background-color: rgb(107 114 128 / var(--tw-bg-opacity, 1));
}

.bg-gray-600{
  --tw-bg-opacity: 1;
  background-color: rgb(75 85 99 / var(--tw-bg-opacity, 1));
}

.bg-gray-800{
  --tw-bg-opacity: 1;
  background-color: rgb(31 41 55 / var(--tw-bg-opacity, 1));
}

.bg-gray-900{
  --tw-bg-opacity: 1;
  background-color: rgb(17 24 39 / var(--tw-bg-opacity, 1));
}

.bg-green-100{
  --tw-bg-opacity: 1;
  background-color: rgb(220 252 231 / var(--tw-bg-opacity, 1));
}

.bg-green-400{
  --tw-bg-opacity: 1;
  background-color: rgb(74 222 128 / var(--tw-bg-opacity, 1));
}

.bg-green-50{
  --tw-bg-opacity: 1;
  background-color: rgb(240 253 244 / var(--tw-bg-opacity, 1));
}

.bg-green-500{
  --tw-bg-opacity: 1;
  background-color: rgb(34 197 94 / var(--tw-bg-opacity, 1));
}

.bg-green-600{
  --tw-bg-opacity: 1;
  background-color: rgb(22 163 74 / var(--tw-bg-opacity, 1));
}

.bg-indigo-100{
  --tw-bg-opacity: 1;
  background-color: rgb(224 231 255 / var(--tw-bg-opacity, 1));
}

.bg-indigo-50{
  --tw-bg-opacity: 1;
  background-color: rgb(238 242 255 / var(--tw-bg-opacity, 1));
}

.bg-indigo-600{
  --tw-bg-opacity: 1;
  background-color: rgb(79 70 229 / var(--tw-bg-opacity, 1));
}

.bg-input{
  background-color: var(--input);
}

.bg-muted{
  background-color: var(--muted);
}

.bg-orange-100{
  --tw-bg-opacity: 1;
  background-color: rgb(255 237 213 / var(--tw-bg-opacity, 1));
}

.bg-orange-50{
  --tw-bg-opacity: 1;
  background-color: rgb(255 247 237 / var(--tw-bg-opacity, 1));
}

.bg-orange-500{
  --tw-bg-opacity: 1;
  background-color: rgb(249 115 22 / var(--tw-bg-opacity, 1));
}

.bg-popover{
  background-color: var(--popover);
}

.bg-primary{
  background-color: var(--primary);
}

.bg-purple-100{
  --tw-bg-opacity: 1;
  background-color: rgb(243 232 255 / var(--tw-bg-opacity, 1));
}

.bg-purple-50{
  --tw-bg-opacity: 1;
  background-color: rgb(250 245 255 / var(--tw-bg-opacity, 1));
}

.bg-purple-600{
  --tw-bg-opacity: 1;
  background-color: rgb(147 51 234 / var(--tw-bg-opacity, 1));
}

.bg-red-100{
  --tw-bg-opacity: 1;
  background-color: rgb(254 226 226 / var(--tw-bg-opacity, 1));
}

.bg-red-50{
  --tw-bg-opacity: 1;
  background-color: rgb(254 242 242 / var(--tw-bg-opacity, 1));
}

.bg-red-500{
  --tw-bg-opacity: 1;
  background-color: rgb(239 68 68 / var(--tw-bg-opacity, 1));
}

.bg-red-600{
  --tw-bg-opacity: 1;
  background-color: rgb(220 38 38 / var(--tw-bg-opacity, 1));
}

.bg-secondary{
  background-color: var(--secondary);
}

.bg-transparent{
  background-color: transparent;
}

.bg-white{
  --tw-bg-opacity: 1;
  background-color: rgb(255 255 255 / var(--tw-bg-opacity, 1));
}

.bg-white\\/20{
  background-color: rgb(255 255 255 / 0.2);
}

.bg-white\\/50{
  background-color: rgb(255 255 255 / 0.5);
}

.bg-white\\/70{
  background-color: rgb(255 255 255 / 0.7);
}

.bg-white\\/75{
  background-color: rgb(255 255 255 / 0.75);
}

.bg-white\\/90{
  background-color: rgb(255 255 255 / 0.9);
}

.bg-yellow-100{
  --tw-bg-opacity: 1;
  background-color: rgb(254 249 195 / var(--tw-bg-opacity, 1));
}

.bg-yellow-200{
  --tw-bg-opacity: 1;
  background-color: rgb(254 240 138 / var(--tw-bg-opacity, 1));
}

.bg-yellow-400{
  --tw-bg-opacity: 1;
  background-color: rgb(250 204 21 / var(--tw-bg-opacity, 1));
}

.bg-yellow-50{
  --tw-bg-opacity: 1;
  background-color: rgb(254 252 232 / var(--tw-bg-opacity, 1));
}

.bg-yellow-500{
  --tw-bg-opacity: 1;
  background-color: rgb(234 179 8 / var(--tw-bg-opacity, 1));
}

.bg-opacity-0{
  --tw-bg-opacity: 0;
}

.bg-opacity-20{
  --tw-bg-opacity: 0.2;
}

.bg-opacity-30{
  --tw-bg-opacity: 0.3;
}

.bg-opacity-40{
  --tw-bg-opacity: 0.4;
}

.bg-opacity-50{
  --tw-bg-opacity: 0.5;
}

.bg-opacity-75{
  --tw-bg-opacity: 0.75;
}

.bg-opacity-80{
  --tw-bg-opacity: 0.8;
}

.bg-cover{
  background-size: cover;
}

.bg-fixed{
  background-attachment: fixed;
}

.bg-local{
  background-attachment: local;
}

.bg-clip-padding{
  background-clip: padding-box;
}

.bg-center{
  background-position: center;
}

.fill-yellow-400{
  fill: #facc15;
}

.object-contain{
  -o-object-fit: contain;
     object-fit: contain;
}

.object-cover{
  -o-object-fit: cover;
     object-fit: cover;
}

.object-center{
  -o-object-position: center;
     object-position: center;
}

.p-0{
  padding: 0px;
}

.p-0\\.5{
  padding: 0.125rem;
}

.p-1{
  padding: 0.25rem;
}

.p-1\\.5{
  padding: 0.375rem;
}

.p-10{
  padding: 2.5rem;
}

.p-12{
  padding: 3rem;
}

.p-2{
  padding: 0.5rem;
}

.p-2\\.5{
  padding: 0.625rem;
}

.p-20{
  padding: 5rem;
}

.p-3{
  padding: 0.75rem;
}

.p-4{
  padding: 1rem;
}

.p-5{
  padding: 1.25rem;
}

.p-6{
  padding: 1.5rem;
}

.p-8{
  padding: 2rem;
}

.p-\\[50px\\]{
  padding: 50px;
}

.px-0{
  padding-left: 0px;
  padding-right: 0px;
}

.px-1{
  padding-left: 0.25rem;
  padding-right: 0.25rem;
}

.px-1\\.5{
  padding-left: 0.375rem;
  padding-right: 0.375rem;
}

.px-2{
  padding-left: 0.5rem;
  padding-right: 0.5rem;
}

.px-2\\.5{
  padding-left: 0.625rem;
  padding-right: 0.625rem;
}

.px-3{
  padding-left: 0.75rem;
  padding-right: 0.75rem;
}

.px-4{
  padding-left: 1rem;
  padding-right: 1rem;
}

.px-5{
  padding-left: 1.25rem;
  padding-right: 1.25rem;
}

.px-6{
  padding-left: 1.5rem;
  padding-right: 1.5rem;
}

.px-8{
  padding-left: 2rem;
  padding-right: 2rem;
}

.py-0{
  padding-top: 0px;
  padding-bottom: 0px;
}

.py-0\\.5{
  padding-top: 0.125rem;
  padding-bottom: 0.125rem;
}

.py-1{
  padding-top: 0.25rem;
  padding-bottom: 0.25rem;
}

.py-1\\.5{
  padding-top: 0.375rem;
  padding-bottom: 0.375rem;
}

.py-10{
  padding-top: 2.5rem;
  padding-bottom: 2.5rem;
}

.py-12{
  padding-top: 3rem;
  padding-bottom: 3rem;
}

.py-14{
  padding-top: 3.5rem;
  padding-bottom: 3.5rem;
}

.py-16{
  padding-top: 4rem;
  padding-bottom: 4rem;
}

.py-2{
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
}

.py-2\\.5{
  padding-top: 0.625rem;
  padding-bottom: 0.625rem;
}

.py-20{
  padding-top: 5rem;
  padding-bottom: 5rem;
}

.py-3{
  padding-top: 0.75rem;
  padding-bottom: 0.75rem;
}

.py-4{
  padding-top: 1rem;
  padding-bottom: 1rem;
}

.py-6{
  padding-top: 1.5rem;
  padding-bottom: 1.5rem;
}

.py-8{
  padding-top: 2rem;
  padding-bottom: 2rem;
}

.pb-12{
  padding-bottom: 3rem;
}

.pb-16{
  padding-bottom: 4rem;
}

.pb-2{
  padding-bottom: 0.5rem;
}

.pb-20{
  padding-bottom: 5rem;
}

.pb-24{
  padding-bottom: 6rem;
}

.pb-3{
  padding-bottom: 0.75rem;
}

.pb-4{
  padding-bottom: 1rem;
}

.pb-48{
  padding-bottom: 12rem;
}

.pb-6{
  padding-bottom: 1.5rem;
}

.pb-8{
  padding-bottom: 2rem;
}

.pb-\\[56\\.25\\%\\]{
  padding-bottom: 56.25%;
}

.pl-1{
  padding-left: 0.25rem;
}

.pl-1\\.5{
  padding-left: 0.375rem;
}

.pl-10{
  padding-left: 2.5rem;
}

.pl-12{
  padding-left: 3rem;
}

.pl-2{
  padding-left: 0.5rem;
}

.pl-2\\.5{
  padding-left: 0.625rem;
}

.pl-3{
  padding-left: 0.75rem;
}

.pl-4{
  padding-left: 1rem;
}

.pl-48{
  padding-left: 12rem;
}

.pl-5{
  padding-left: 1.25rem;
}

.pl-6{
  padding-left: 1.5rem;
}

.pl-8{
  padding-left: 2rem;
}

.pl-9{
  padding-left: 2.25rem;
}

.pr-1{
  padding-right: 0.25rem;
}

.pr-10{
  padding-right: 2.5rem;
}

.pr-2{
  padding-right: 0.5rem;
}

.pr-3{
  padding-right: 0.75rem;
}

.pr-4{
  padding-right: 1rem;
}

.pr-6{
  padding-right: 1.5rem;
}

.pr-8{
  padding-right: 2rem;
}

.pt-0{
  padding-top: 0px;
}

.pt-0\\.5{
  padding-top: 0.125rem;
}

.pt-1{
  padding-top: 0.25rem;
}

.pt-2{
  padding-top: 0.5rem;
}

.pt-3{
  padding-top: 0.75rem;
}

.pt-4{
  padding-top: 1rem;
}

.pt-5{
  padding-top: 1.25rem;
}

.pt-6{
  padding-top: 1.5rem;
}

.pt-8{
  padding-top: 2rem;
}

.text-left{
  text-align: left;
}

.text-center{
  text-align: center;
}

.text-right{
  text-align: right;
}

.align-top{
  vertical-align: top;
}

.align-middle{
  vertical-align: middle;
}

.font-mono{
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}

.font-sans{
  font-family: ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
}

.font-serif{
  font-family: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
}

.text-2xl{
  font-size: 1.5rem;
  line-height: 2rem;
}

.text-3xl{
  font-size: 1.875rem;
  line-height: 2.25rem;
}

.text-4xl{
  font-size: 2.25rem;
  line-height: 2.5rem;
}

.text-5xl{
  font-size: 3rem;
  line-height: 1;
}

.text-6xl{
  font-size: 3.75rem;
  line-height: 1;
}

.text-\\[0\\.8rem\\]{
  font-size: 0.8rem;
}

.text-\\[10px\\]{
  font-size: 10px;
}

.text-base{
  font-size: 1rem;
  line-height: 1.5rem;
}

.text-lg{
  font-size: 1.125rem;
  line-height: 1.75rem;
}

.text-sm{
  font-size: 0.875rem;
  line-height: 1.25rem;
}

.text-sm\\/6{
  font-size: 0.875rem;
  line-height: 1.5rem;
}

.text-xl{
  font-size: 1.25rem;
  line-height: 1.75rem;
}

.text-xs{
  font-size: 0.75rem;
  line-height: 1rem;
}

.font-bold{
  font-weight: 700;
}

.font-medium{
  font-weight: 500;
}

.font-normal{
  font-weight: 400;
}

.font-semibold{
  font-weight: 600;
}

.uppercase{
  text-transform: uppercase;
}

.capitalize{
  text-transform: capitalize;
}

.italic{
  font-style: italic;
}

.leading-4{
  line-height: 1rem;
}

.leading-5{
  line-height: 1.25rem;
}

.leading-\\[16px\\]{
  line-height: 16px;
}

.leading-none{
  line-height: 1;
}

.leading-relaxed{
  line-height: 1.625;
}

.leading-snug{
  line-height: 1.375;
}

.leading-tight{
  line-height: 1.25;
}

.tracking-\\[-\\.01em\\]{
  letter-spacing: -.01em;
}

.tracking-tight{
  letter-spacing: -0.025em;
}

.tracking-wider{
  letter-spacing: 0.05em;
}

.text-\\[var\\(--navbar-text\\2c var\\(--foreground\\2c \\#0f172a\\)\\)\\]{
  color: var(--navbar-text,var(--foreground,#0f172a));
}

.text-accent-foreground{
  color: var(--accent-foreground);
}

.text-amber-600{
  --tw-text-opacity: 1;
  color: rgb(217 119 6 / var(--tw-text-opacity, 1));
}

.text-amber-700{
  --tw-text-opacity: 1;
  color: rgb(180 83 9 / var(--tw-text-opacity, 1));
}

.text-background{
  color: var(--background);
}

.text-black{
  --tw-text-opacity: 1;
  color: rgb(0 0 0 / var(--tw-text-opacity, 1));
}

.text-blue-100{
  --tw-text-opacity: 1;
  color: rgb(219 234 254 / var(--tw-text-opacity, 1));
}

.text-blue-200{
  --tw-text-opacity: 1;
  color: rgb(191 219 254 / var(--tw-text-opacity, 1));
}

.text-blue-300{
  --tw-text-opacity: 1;
  color: rgb(147 197 253 / var(--tw-text-opacity, 1));
}

.text-blue-500{
  --tw-text-opacity: 1;
  color: rgb(59 130 246 / var(--tw-text-opacity, 1));
}

.text-blue-600{
  --tw-text-opacity: 1;
  color: rgb(37 99 235 / var(--tw-text-opacity, 1));
}

.text-blue-700{
  --tw-text-opacity: 1;
  color: rgb(29 78 216 / var(--tw-text-opacity, 1));
}

.text-blue-800{
  --tw-text-opacity: 1;
  color: rgb(30 64 175 / var(--tw-text-opacity, 1));
}

.text-card-foreground{
  color: var(--card-foreground);
}

.text-destructive{
  color: var(--destructive);
}

.text-emerald-600{
  --tw-text-opacity: 1;
  color: rgb(5 150 105 / var(--tw-text-opacity, 1));
}

.text-emerald-700{
  --tw-text-opacity: 1;
  color: rgb(4 120 87 / var(--tw-text-opacity, 1));
}

.text-foreground{
  color: var(--foreground);
}

.text-gray-200{
  --tw-text-opacity: 1;
  color: rgb(229 231 235 / var(--tw-text-opacity, 1));
}

.text-gray-300{
  --tw-text-opacity: 1;
  color: rgb(209 213 219 / var(--tw-text-opacity, 1));
}

.text-gray-400{
  --tw-text-opacity: 1;
  color: rgb(156 163 175 / var(--tw-text-opacity, 1));
}

.text-gray-500{
  --tw-text-opacity: 1;
  color: rgb(107 114 128 / var(--tw-text-opacity, 1));
}

.text-gray-600{
  --tw-text-opacity: 1;
  color: rgb(75 85 99 / var(--tw-text-opacity, 1));
}

.text-gray-700{
  --tw-text-opacity: 1;
  color: rgb(55 65 81 / var(--tw-text-opacity, 1));
}

.text-gray-800{
  --tw-text-opacity: 1;
  color: rgb(31 41 55 / var(--tw-text-opacity, 1));
}

.text-gray-900{
  --tw-text-opacity: 1;
  color: rgb(17 24 39 / var(--tw-text-opacity, 1));
}

.text-green-400{
  --tw-text-opacity: 1;
  color: rgb(74 222 128 / var(--tw-text-opacity, 1));
}

.text-green-500{
  --tw-text-opacity: 1;
  color: rgb(34 197 94 / var(--tw-text-opacity, 1));
}

.text-green-600{
  --tw-text-opacity: 1;
  color: rgb(22 163 74 / var(--tw-text-opacity, 1));
}

.text-green-700{
  --tw-text-opacity: 1;
  color: rgb(21 128 61 / var(--tw-text-opacity, 1));
}

.text-green-800{
  --tw-text-opacity: 1;
  color: rgb(22 101 52 / var(--tw-text-opacity, 1));
}

.text-indigo-600{
  --tw-text-opacity: 1;
  color: rgb(79 70 229 / var(--tw-text-opacity, 1));
}

.text-muted-foreground{
  color: var(--muted-foreground);
}

.text-orange-500{
  --tw-text-opacity: 1;
  color: rgb(249 115 22 / var(--tw-text-opacity, 1));
}

.text-orange-600{
  --tw-text-opacity: 1;
  color: rgb(234 88 12 / var(--tw-text-opacity, 1));
}

.text-orange-700{
  --tw-text-opacity: 1;
  color: rgb(194 65 12 / var(--tw-text-opacity, 1));
}

.text-orange-800{
  --tw-text-opacity: 1;
  color: rgb(154 52 18 / var(--tw-text-opacity, 1));
}

.text-popover-foreground{
  color: var(--popover-foreground);
}

.text-primary{
  color: var(--primary);
}

.text-primary-foreground{
  color: var(--primary-foreground);
}

.text-purple-600{
  --tw-text-opacity: 1;
  color: rgb(147 51 234 / var(--tw-text-opacity, 1));
}

.text-purple-700{
  --tw-text-opacity: 1;
  color: rgb(126 34 206 / var(--tw-text-opacity, 1));
}

.text-red-400{
  --tw-text-opacity: 1;
  color: rgb(248 113 113 / var(--tw-text-opacity, 1));
}

.text-red-500{
  --tw-text-opacity: 1;
  color: rgb(239 68 68 / var(--tw-text-opacity, 1));
}

.text-red-600{
  --tw-text-opacity: 1;
  color: rgb(220 38 38 / var(--tw-text-opacity, 1));
}

.text-red-700{
  --tw-text-opacity: 1;
  color: rgb(185 28 28 / var(--tw-text-opacity, 1));
}

.text-red-800{
  --tw-text-opacity: 1;
  color: rgb(153 27 27 / var(--tw-text-opacity, 1));
}

.text-secondary-foreground{
  color: var(--secondary-foreground);
}

.text-slate-500{
  --tw-text-opacity: 1;
  color: rgb(100 116 139 / var(--tw-text-opacity, 1));
}

.text-slate-700{
  --tw-text-opacity: 1;
  color: rgb(51 65 85 / var(--tw-text-opacity, 1));
}

.text-slate-900{
  --tw-text-opacity: 1;
  color: rgb(15 23 42 / var(--tw-text-opacity, 1));
}

.text-white{
  --tw-text-opacity: 1;
  color: rgb(255 255 255 / var(--tw-text-opacity, 1));
}

.text-yellow-400{
  --tw-text-opacity: 1;
  color: rgb(250 204 21 / var(--tw-text-opacity, 1));
}

.text-yellow-500{
  --tw-text-opacity: 1;
  color: rgb(234 179 8 / var(--tw-text-opacity, 1));
}

.text-yellow-600{
  --tw-text-opacity: 1;
  color: rgb(202 138 4 / var(--tw-text-opacity, 1));
}

.text-yellow-700{
  --tw-text-opacity: 1;
  color: rgb(161 98 7 / var(--tw-text-opacity, 1));
}

.text-yellow-800{
  --tw-text-opacity: 1;
  color: rgb(133 77 14 / var(--tw-text-opacity, 1));
}

.underline{
  text-decoration-line: underline;
}

.no-underline{
  text-decoration-line: none;
}

.underline-offset-2{
  text-underline-offset: 2px;
}

.underline-offset-4{
  text-underline-offset: 4px;
}

.antialiased{
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.accent-foreground{
  accent-color: var(--foreground);
}

.opacity-0{
  opacity: 0;
}

.opacity-100{
  opacity: 1;
}

.opacity-20{
  opacity: 0.2;
}

.opacity-25{
  opacity: 0.25;
}

.opacity-50{
  opacity: 0.5;
}

.opacity-60{
  opacity: 0.6;
}

.opacity-70{
  opacity: 0.7;
}

.opacity-75{
  opacity: 0.75;
}

.shadow{
  --tw-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
  --tw-shadow-colored: 0 1px 3px 0 var(--tw-shadow-color), 0 1px 2px -1px var(--tw-shadow-color);
  box-shadow: var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow);
}

.shadow-2xl{
  --tw-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25);
  --tw-shadow-colored: 0 25px 50px -12px var(--tw-shadow-color);
  box-shadow: var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow);
}

.shadow-lg{
  --tw-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --tw-shadow-colored: 0 10px 15px -3px var(--tw-shadow-color), 0 4px 6px -4px var(--tw-shadow-color);
  box-shadow: var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow);
}

.shadow-md{
  --tw-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --tw-shadow-colored: 0 4px 6px -1px var(--tw-shadow-color), 0 2px 4px -2px var(--tw-shadow-color);
  box-shadow: var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow);
}

.shadow-none{
  --tw-shadow: 0 0 #0000;
  --tw-shadow-colored: 0 0 #0000;
  box-shadow: var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow);
}

.shadow-sm{
  --tw-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --tw-shadow-colored: 0 1px 2px 0 var(--tw-shadow-color);
  box-shadow: var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow);
}

.shadow-xl{
  --tw-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
  --tw-shadow-colored: 0 20px 25px -5px var(--tw-shadow-color), 0 8px 10px -6px var(--tw-shadow-color);
  box-shadow: var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow);
}

.outline-none{
  outline: 2px solid transparent;
  outline-offset: 2px;
}

.outline{
  outline-style: solid;
}

.ring{
  --tw-ring-offset-shadow: var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color);
  --tw-ring-shadow: var(--tw-ring-inset) 0 0 0 calc(3px + var(--tw-ring-offset-width)) var(--tw-ring-color);
  box-shadow: var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow, 0 0 #0000);
}

.ring-1{
  --tw-ring-offset-shadow: var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color);
  --tw-ring-shadow: var(--tw-ring-inset) 0 0 0 calc(1px + var(--tw-ring-offset-width)) var(--tw-ring-color);
  box-shadow: var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow, 0 0 #0000);
}

.ring-2{
  --tw-ring-offset-shadow: var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color);
  --tw-ring-shadow: var(--tw-ring-inset) 0 0 0 calc(2px + var(--tw-ring-offset-width)) var(--tw-ring-color);
  box-shadow: var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow, 0 0 #0000);
}

.ring-blue-200{
  --tw-ring-opacity: 1;
  --tw-ring-color: rgb(191 219 254 / var(--tw-ring-opacity, 1));
}

.ring-blue-300{
  --tw-ring-opacity: 1;
  --tw-ring-color: rgb(147 197 253 / var(--tw-ring-opacity, 1));
}

.ring-blue-400{
  --tw-ring-opacity: 1;
  --tw-ring-color: rgb(96 165 250 / var(--tw-ring-opacity, 1));
}

.ring-blue-500{
  --tw-ring-opacity: 1;
  --tw-ring-color: rgb(59 130 246 / var(--tw-ring-opacity, 1));
}

.ring-destructive{
  --tw-ring-color: var(--destructive);
}

.ring-foreground{
  --tw-ring-color: var(--foreground);
}

.ring-primary{
  --tw-ring-color: var(--primary);
}

.ring-ring{
  --tw-ring-color: var(--ring);
}

.ring-transparent{
  --tw-ring-color: transparent;
}

.blur{
  --tw-blur: blur(8px);
  filter: var(--tw-blur) var(--tw-brightness) var(--tw-contrast) var(--tw-grayscale) var(--tw-hue-rotate) var(--tw-invert) var(--tw-saturate) var(--tw-sepia) var(--tw-drop-shadow);
}

.drop-shadow{
  --tw-drop-shadow: drop-shadow(0 1px 2px rgb(0 0 0 / 0.1)) drop-shadow(0 1px 1px rgb(0 0 0 / 0.06));
  filter: var(--tw-blur) var(--tw-brightness) var(--tw-contrast) var(--tw-grayscale) var(--tw-hue-rotate) var(--tw-invert) var(--tw-saturate) var(--tw-sepia) var(--tw-drop-shadow);
}

.drop-shadow-lg{
  --tw-drop-shadow: drop-shadow(0 10px 8px rgb(0 0 0 / 0.04)) drop-shadow(0 4px 3px rgb(0 0 0 / 0.1));
  filter: var(--tw-blur) var(--tw-brightness) var(--tw-contrast) var(--tw-grayscale) var(--tw-hue-rotate) var(--tw-invert) var(--tw-saturate) var(--tw-sepia) var(--tw-drop-shadow);
}

.drop-shadow-md{
  --tw-drop-shadow: drop-shadow(0 4px 3px rgb(0 0 0 / 0.07)) drop-shadow(0 2px 2px rgb(0 0 0 / 0.06));
  filter: var(--tw-blur) var(--tw-brightness) var(--tw-contrast) var(--tw-grayscale) var(--tw-hue-rotate) var(--tw-invert) var(--tw-saturate) var(--tw-sepia) var(--tw-drop-shadow);
}

.grayscale{
  --tw-grayscale: grayscale(100%);
  filter: var(--tw-blur) var(--tw-brightness) var(--tw-contrast) var(--tw-grayscale) var(--tw-hue-rotate) var(--tw-invert) var(--tw-saturate) var(--tw-sepia) var(--tw-drop-shadow);
}

.invert{
  --tw-invert: invert(100%);
  filter: var(--tw-blur) var(--tw-brightness) var(--tw-contrast) var(--tw-grayscale) var(--tw-hue-rotate) var(--tw-invert) var(--tw-saturate) var(--tw-sepia) var(--tw-drop-shadow);
}

.filter{
  filter: var(--tw-blur) var(--tw-brightness) var(--tw-contrast) var(--tw-grayscale) var(--tw-hue-rotate) var(--tw-invert) var(--tw-saturate) var(--tw-sepia) var(--tw-drop-shadow);
}

.backdrop-blur{
  --tw-backdrop-blur: blur(8px);
  backdrop-filter: var(--tw-backdrop-blur) var(--tw-backdrop-brightness) var(--tw-backdrop-contrast) var(--tw-backdrop-grayscale) var(--tw-backdrop-hue-rotate) var(--tw-backdrop-invert) var(--tw-backdrop-opacity) var(--tw-backdrop-saturate) var(--tw-backdrop-sepia);
}

.backdrop-blur-sm{
  --tw-backdrop-blur: blur(4px);
  backdrop-filter: var(--tw-backdrop-blur) var(--tw-backdrop-brightness) var(--tw-backdrop-contrast) var(--tw-backdrop-grayscale) var(--tw-backdrop-hue-rotate) var(--tw-backdrop-invert) var(--tw-backdrop-opacity) var(--tw-backdrop-saturate) var(--tw-backdrop-sepia);
}

.backdrop-filter{
  backdrop-filter: var(--tw-backdrop-blur) var(--tw-backdrop-brightness) var(--tw-backdrop-contrast) var(--tw-backdrop-grayscale) var(--tw-backdrop-hue-rotate) var(--tw-backdrop-invert) var(--tw-backdrop-opacity) var(--tw-backdrop-saturate) var(--tw-backdrop-sepia);
}

.transition{
  transition-property: color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
}

.transition-all{
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
}

.transition-colors{
  transition-property: color, background-color, border-color, text-decoration-color, fill, stroke;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
}

.transition-opacity{
  transition-property: opacity;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
}

.transition-shadow{
  transition-property: box-shadow;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
}

.transition-transform{
  transition-property: transform;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
}

.duration-100{
  transition-duration: 100ms;
}

.duration-150{
  transition-duration: 150ms;
}

.duration-200{
  transition-duration: 200ms;
}

.duration-300{
  transition-duration: 300ms;
}

.duration-500{
  transition-duration: 500ms;
}

.duration-700{
  transition-duration: 700ms;
}

.ease-in{
  transition-timing-function: cubic-bezier(0.4, 0, 1, 1);
}

.ease-in-out{
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

.ease-out{
  transition-timing-function: cubic-bezier(0, 0, 0.2, 1);
}

.will-change-transform{
  will-change: transform;
}

@keyframes enter{
  from{
    opacity: var(--tw-enter-opacity, 1);
    transform: translate3d(var(--tw-enter-translate-x, 0), var(--tw-enter-translate-y, 0), 0) scale3d(var(--tw-enter-scale, 1), var(--tw-enter-scale, 1), var(--tw-enter-scale, 1)) rotate(var(--tw-enter-rotate, 0));
  }
}

@keyframes exit{
  to{
    opacity: var(--tw-exit-opacity, 1);
    transform: translate3d(var(--tw-exit-translate-x, 0), var(--tw-exit-translate-y, 0), 0) scale3d(var(--tw-exit-scale, 1), var(--tw-exit-scale, 1), var(--tw-exit-scale, 1)) rotate(var(--tw-exit-rotate, 0));
  }
}

.animate-in{
  animation-name: enter;
  animation-duration: 150ms;
  --tw-enter-opacity: initial;
  --tw-enter-scale: initial;
  --tw-enter-rotate: initial;
  --tw-enter-translate-x: initial;
  --tw-enter-translate-y: initial;
}

.fade-in{
  --tw-enter-opacity: 0;
}

.slide-in-from-bottom-2{
  --tw-enter-translate-y: 0.5rem;
}

.slide-in-from-top-2{
  --tw-enter-translate-y: -0.5rem;
}

.duration-100{
  animation-duration: 100ms;
}

.duration-150{
  animation-duration: 150ms;
}

.duration-200{
  animation-duration: 200ms;
}

.duration-300{
  animation-duration: 300ms;
}

.duration-500{
  animation-duration: 500ms;
}

.duration-700{
  animation-duration: 700ms;
}

.ease-in{
  animation-timing-function: cubic-bezier(0.4, 0, 1, 1);
}

.ease-in-out{
  animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

.ease-out{
  animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
}

.running{
  animation-play-state: running;
}

/* ============================================================
   本地字体声明（前后台共用）
   ============================================================ */

/* ============================================================
   默认 CSS 变量
   
   用途：
   - 后台使用（不注入主题，用默认值）
   - 前台降级（主题未设置某变量时回退）
   
   注意：
   - 放在 @layer 之外，优先级与主题注入相同
   - 前台主题注入后，会覆盖这些默认值
   ============================================================ */

:root {
  /* ============================================================
     1. 颜色变量（Shadcn 基础）
     ============================================================ */
  --background: #ffffff;
  --foreground: #0f172a;
  --card: #ffffff;
  --card-foreground: #0f172a;
  --popover: #ffffff;
  --popover-foreground: #0f172a;
  --primary: #1e293b;
  --primary-foreground: #f8fafc;
  --secondary: #f1f5f9;
  --secondary-foreground: #0f172a;
  --muted: #f1f5f9;
  --muted-foreground: #64748b;
  --accent: #f1f5f9;
  --accent-foreground: #0f172a;
  --destructive: #ef4444;
  --destructive-foreground: #ffffff;
  --border: #e2e8f0;
  --input: #e2e8f0;
  --ring: #0f172a;
  /* ============================================================
     2. 字体（font-family）
     
     多语言策略：
     - font-sans：Geist（英文）→ Inter（备选）→ Noto Sans SC（中文）
                   → 系统字体 → Noto Sans（西里尔/希腊）→ 兜底
     - font-heading：Plus Jakarta Sans（标题）→ Geist → Noto Sans SC
     - font-serif / font-mono：系统字体链
     ============================================================ */
  --font-sans: 
    'Geist', 
    'Inter', 
    'Noto Sans SC',
    -apple-system, 
    BlinkMacSystemFont, 
    'Segoe UI', 
    Roboto, 
    'Helvetica Neue', 
    'Noto Sans', 
    Arial, 
    sans-serif, 
    'Apple Color Emoji', 
    'Segoe UI Emoji', 
    'Segoe UI Symbol', 
    'Noto Color Emoji';
  --font-heading: 
    'Plus Jakarta Sans', 
    'Geist', 
    'Inter', 
    'Noto Sans SC',
    -apple-system, 
    BlinkMacSystemFont, 
    'Segoe UI', 
    Roboto, 
    'Helvetica Neue', 
    Arial, 
    sans-serif;
  --font-serif: 
    ui-serif, 
    Georgia, 
    Cambria, 
    'Times New Roman', 
    Times, 
    serif;
  --font-mono: 
    ui-monospace, 
    SFMono-Regular, 
    Menlo, 
    Monaco, 
    Consolas, 
    'Liberation Mono', 
    'Courier New', 
    monospace;
  /* ============================================================
     3. 字号（font-size）
     ============================================================ */
  --font-size-xs: 0.75rem;
  /* 12px */
  --font-size-sm: 0.875rem;
  /* 14px */
  --font-size-base: 1rem;
  /* 16px */
  --font-size-lg: 1.125rem;
  /* 18px */
  --font-size-xl: 1.25rem;
  /* 20px */
  --font-size-2xl: 1.5rem;
  /* 24px */
  --font-size-3xl: 1.875rem;
  /* 30px */
  --font-size-4xl: 2.25rem;
  /* 36px */
  /* ============================================================
     4. 字重（font-weight）
     ============================================================ */
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
  /* ============================================================
     5. 行高（line-height）
     ============================================================ */
  --line-height-tight: 1.25;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.625;
  /* ============================================================
     6. 字间距（letter-spacing）
     ============================================================ */
  --letter-spacing-tight: -0.025em;
  --letter-spacing-normal: 0;
  --letter-spacing-wide: 0.025em;
  /* ============================================================
     8. 间距（spacing）
     ============================================================ */
  --spacing-unit: 0.25rem;
  --spacing-1: 0.25rem;
  --spacing-2: 0.5rem;
  --spacing-3: 0.75rem;
  --spacing-4: 1rem;
  --spacing-5: 1.25rem;
  --spacing-6: 1.5rem;
  --spacing-8: 2rem;
  --spacing-10: 2.5rem;
  --spacing-12: 3rem;
  --container-padding: 1rem;
  --section-gap: 2rem;
  --grid-gap: 1rem;
  --product-card-padding: 1rem;
  /* ============================================================
     9. 圆角（border-radius）
     ============================================================ */
  --radius: 0.625rem;
  --radius-sm: 0.5rem;
  --radius-md: 0.625rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
  --radius-2xl: 1.5rem;
  --radius-full: 9999px;
  --product-card-radius: var(--radius);
  --btn-radius: var(--radius);
  --input-radius: var(--radius);
  /* ============================================================
     10. 阴影（box-shadow）
     ============================================================ */
  --shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.1);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1);
  --shadow-2xl: 0 25px 50px -12px rgb(0 0 0 / 0.25);
  /* ============================================================
     11. 动效（transition）
     ============================================================ */
  --transition-duration-75: 75ms;
  --transition-duration-100: 100ms;
  --transition-duration-150: 150ms;
  --transition-duration-200: 200ms;
  --transition-duration-300: 300ms;
  --transition-duration-500: 500ms;
  --transition-timing-ease: ease;
  --transition-timing-linear: linear;
  --transition-timing-in: ease-in;
  --transition-timing-out: ease-out;
  /* ============================================================
     12. 导航栏变量（由前台主题提供，后台有默认值）
     ============================================================ */
  --navbar-bg: var(--background);
}

/* ============================================================
   暗色模式（仅当 .dark 类存在时生效）
   ============================================================ */

.dark {
  --background: #020617;
  --foreground: #f8fafc;
  --card: #1e293b;
  --card-foreground: #f8fafc;
  --popover: #1e293b;
  --popover-foreground: #f8fafc;
  --primary: #f8fafc;
  --primary-foreground: #0f172a;
  --secondary: #1e293b;
  --secondary-foreground: #f8fafc;
  --muted: #1e293b;
  --muted-foreground: #94a3b8;
  --accent: #1e293b;
  --accent-foreground: #f8fafc;
  --destructive: #7f1d1d;
  --destructive-foreground: #f8fafc;
  --border: #1e293b;
  --input: #1e293b;
  --ring: #94a3b8;
}

/* ============================================================
   全局样式
   ============================================================ */

/* ============================================================
   前后台分离：后台强制使用默认字体（不跟随前台主题）
   ============================================================ */

.admin-zone {
  --font-sans: 
    -apple-system, 
    BlinkMacSystemFont, 
    'Segoe UI', 
    Roboto, 
    'Helvetica Neue', 
    Arial, 
    sans-serif;
  --font-heading: 
    -apple-system, 
    BlinkMacSystemFont, 
    'Segoe UI', 
    Roboto, 
    'Helvetica Neue', 
    Arial, 
    sans-serif;
}

/* 后台正文跟随 --font-sans */

.admin-zone body,
.admin-zone {
  font-family: var(--font-sans);
}

/* 后台标题也跟随 --font-heading（此时已重置为系统字体） */

.admin-zone h1,
.admin-zone h2,
.admin-zone h3,
.admin-zone h4,
.admin-zone h5,
.admin-zone h6 {
  font-family: var(--font-heading);
}

/* ============================================================
   通用组件样式（服务器组件中使用，避免事件处理器）
   ============================================================ */

/* 页脚政策链接（用于服务器组件 PolicyLinks，用 CSS 伪类实现 hover） */

.policy-link {
  font-size: var(--font-size-xs, 0.75rem);
  color: var(--muted-foreground, #64748b);
  transition: color var(--transition-duration-150, 150ms) var(--transition-timing-ease, ease);
}

.policy-link:hover {
  color: var(--foreground, #0f172a);
}

/* ============================================================
   菜单下拉动画
   ============================================================ */

@keyframes slideIn {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(-10px);
  }

  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.animate-dropdown {
  animation: slideIn 0.25s cubic-bezier(0.2, 0.9, 0.4, 1.1) forwards;
}

/* ============================================================
   编辑器样式（ProseMirror）
   ============================================================ */

.ProseMirror {
  outline: none;
  line-height: 1.8;
}

.ProseMirror img {
  max-width: 100%;
  height: auto;
}

.ProseMirror table {
  border-collapse: collapse;
  width: 100%;
}

.ProseMirror td,
.ProseMirror th {
  border: 1px solid #ddd;
  padding: 0.5rem;
}

.ProseMirror pre {
  background: #f5f5f5;
  padding: 0.75rem;
  border-radius: 0.5rem;
  overflow-x: auto;
}

.ProseMirror code {
  font-family: var(--font-mono);
}

.ProseMirror {
  background-color: #ffffff;
}

.ProseMirror ul,
.ProseMirror ol {
  list-style: revert !important;
  padding-left: 1.5rem !important;
}

.ProseMirror ul {
  list-style-type: disc;
}

.ProseMirror ol {
  list-style-type: decimal;
}

.ProseMirror img[data-align="left"] {
  float: left;
  margin: 0 1rem 0.5rem 0;
}

.ProseMirror img[data-align="center"] {
  display: block;
  margin: 0 auto;
}

.ProseMirror img[data-align="right"] {
  float: right;
  margin: 0 0 0.5rem 1rem;
}

.ProseMirror img {
  position: relative;
  cursor: default;
}

.ProseMirror img[data-drag-handle] {
  cursor: grab;
}

.ProseMirror img[data-drag-handle]:active {
  cursor: grabbing;
}

.ProseMirror .resize-handle {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 10px;
  height: 10px;
  background: #2563eb;
  cursor: se-resize;
  border-radius: 50%;
}

.ProseMirror .resizable-image {
  display: inline-block;
  position: relative;
  cursor: pointer;
}

.ProseMirror .resizable-image.selected {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

.video-embed {
  position: relative;
  padding-bottom: 56.25%;
  height: 0;
  overflow: hidden;
  margin: 1rem 0;
}

.video-embed iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

blockquote {
  margin: 1rem 0;
  padding-left: 1rem;
  border-left: 4px solid #e5e7eb;
  color: #6b7280;
  font-style: italic;
}

ul[data-type="taskList"] {
  list-style: none;
  padding-left: 0;
}

ul[data-type="taskList"] li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

ul[data-type="taskList"] li input[type="checkbox"] {
  margin: 0;
}

.image-align-toolbar {
  position: fixed;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  display: flex;
  gap: 0.25rem;
  padding: 0.25rem;
  z-index: 20;
}

.image-align-toolbar button {
  padding: 0.25rem;
  border-radius: 0.25rem;
  background: transparent;
  transition: background 0.2s;
}

.image-align-toolbar button:hover {
  background: #f3f4f6;
}

.image-align-toolbar button.active {
  background: #dbeafe;
  color: #1e40af;
}

.react-draggable-dragging {
  cursor: grabbing;
}

.editor-fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 9999;
  background: white;
  overflow: auto;
}

.editor-fullscreen .ProseMirror {
  max-width: 800px;
  margin: 10rem auto;
  padding: 2rem;
  box-shadow: 0 0 10px rgba(0,0,0,0.1);
}

.editor-fullscreen-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #f3f4f6;
  z-index: 9999;
  overflow-y: auto;
  padding: 1rem;
}

.editor-fullscreen-overlay .editor-container {
  max-width: 800px;
  margin: 0 auto;
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
}

.editor-fullscreen-overlay .editor-container .sticky {
  position: sticky;
  top: 0;
  background: white;
  z-index: 10;
}

.prose iframe {
  width: 100%;
  height: auto;
  aspect-ratio: 16 / 9;
}

.prose {
  line-height: 1.8 !important;
}

.prose p {
  line-height: 2.0 !important;
}

/* ============================================================
   Shopify 超级菜单样式
   ============================================================ */

/* ============================================================
   Crowdin 文档内容样式（对齐 Starlight）
   只作用于 .doc-markdown 容器
   用于 DocumentLibraryBlock 的 Markdown 渲染区
   ============================================================ */

.doc-markdown {
  font-size: var(--font-size-base, 1rem);
  line-height: 1.75;
  color: var(--doc-detail-content-color, var(--foreground, #263238));
}

.doc-markdown h1 {
  font-size: var(--font-size-4xl, 2.25rem);
  font-weight: var(--font-weight-bold, 700);
  line-height: 1.25;
  color: var(--doc-detail-title-color, var(--foreground, #263238));
  margin: 0 0 var(--spacing-6, 1.5rem);
  letter-spacing: var(--letter-spacing-tight, -0.025em);
}

.doc-markdown h2 {
  font-size: var(--font-size-2xl, 1.5rem);
  font-weight: var(--font-weight-semibold, 600);
  line-height: 1.33;
  color: var(--doc-detail-heading-color, var(--foreground, #263238));
  margin: var(--spacing-10, 2.5rem) 0 var(--spacing-4, 1rem);
  padding-bottom: var(--spacing-2, 0.5rem);
  border-bottom: 1px solid var(--doc-detail-divider-color, var(--border, #edeef3));
  letter-spacing: var(--letter-spacing-tight, -0.025em);
}

.doc-markdown h3 {
  font-size: var(--font-size-xl, 1.25rem);
  font-weight: var(--font-weight-semibold, 600);
  line-height: 1.4;
  color: var(--doc-detail-heading-color, var(--foreground, #263238));
  margin: var(--spacing-8, 2rem) 0 var(--spacing-3, 0.75rem);
  letter-spacing: var(--letter-spacing-tight, -0.025em);
}

.doc-markdown h4 {
  font-size: var(--font-size-lg, 1.125rem);
  font-weight: var(--font-weight-semibold, 600);
  color: var(--doc-detail-heading-color, var(--foreground, #263238));
  margin: var(--spacing-6, 1.5rem) 0 var(--spacing-2, 0.5rem);
}

.doc-markdown h5,
.doc-markdown h6 {
  font-size: var(--font-size-base, 1rem);
  font-weight: var(--font-weight-semibold, 600);
  color: var(--doc-detail-heading-color, var(--foreground, #263238));
  margin: var(--spacing-5, 1.25rem) 0 var(--spacing-2, 0.5rem);
}

.doc-markdown p {
  margin: 0 0 var(--spacing-5, 1.25rem);
}

.doc-markdown a {
  color: var(--doc-detail-link-color, var(--primary, #43a047));
  text-decoration: underline;
  text-underline-offset: 3px;
  text-decoration-thickness: 1px;
  transition: color var(--transition-duration-150, 150ms) var(--transition-timing-ease, ease);
}

.doc-markdown a:hover {
  text-decoration-thickness: 2px;
}

.doc-markdown blockquote {
  border-left: 4px solid var(--doc-detail-link-color, var(--primary, #43a047));
  background: var(--muted, #f5f7f8);
  padding: var(--spacing-4, 1rem) var(--spacing-6, 1.5rem);
  margin: var(--spacing-6, 1.5rem) 0;
  border-radius: 0 var(--radius-md, 0.5rem) var(--radius-md, 0.5rem) 0;
  color: var(--doc-detail-content-color, var(--foreground, #263238));
  font-style: normal;
}

.doc-markdown blockquote p:last-child {
  margin-bottom: 0;
}

.doc-markdown ul,
.doc-markdown ol {
  margin: var(--spacing-4, 1rem) 0;
  padding-left: var(--spacing-6, 1.5rem);
}

.doc-markdown ul {
  list-style: disc;
}

.doc-markdown ol {
  list-style: decimal;
}

.doc-markdown li {
  margin: var(--spacing-2, 0.5rem) 0;
}

.doc-markdown li > p {
  margin-bottom: var(--spacing-2, 0.5rem);
}

.doc-markdown code {
  background: var(--muted, #f5f7f8);
  padding: 2px 6px;
  border-radius: var(--radius-sm, 0.25rem);
  font-size: 0.875em;
  color: var(--doc-detail-content-color, var(--foreground, #263238));
  font-family: var(--font-mono);
}

.doc-markdown pre {
  background: var(--muted, #f5f7f8);
  padding: var(--spacing-4, 1rem);
  border-radius: var(--radius-md, 0.5rem);
  overflow-x: auto;
  margin: var(--spacing-6, 1.5rem) 0;
}

.doc-markdown pre code {
  background: transparent;
  padding: 0;
  border-radius: 0;
}

.doc-markdown img {
  max-width: 100%;
  height: auto;
  border-radius: var(--radius-md, 0.5rem);
  margin: var(--spacing-6, 1.5rem) 0;
}

.doc-markdown hr {
  border: 0;
  border-top: 1px solid var(--doc-detail-divider-color, var(--border, #edeef3));
  margin: var(--spacing-8, 2rem) 0;
}

.doc-markdown table {
  width: 100%;
  border-collapse: collapse;
  margin: var(--spacing-6, 1.5rem) 0;
  font-size: var(--font-size-sm, 0.875rem);
}

.doc-markdown th,
.doc-markdown td {
  border: 1px solid var(--border, #e2e8f0);
  padding: var(--spacing-2, 0.5rem) var(--spacing-3, 0.75rem);
  text-align: left;
}

.doc-markdown th {
  background: var(--muted, #f5f7f8);
  font-weight: var(--font-weight-semibold, 600);
  color: var(--doc-detail-heading-color, var(--foreground, #263238));
}

.doc-markdown strong {
  font-weight: var(--font-weight-bold, 700);
  color: var(--doc-detail-heading-color, var(--foreground, #263238));
}

.doc-markdown em {
  font-style: italic;
}

.doc-markdown > *:first-child {
  margin-top: 0;
}

.doc-markdown > *:last-child {
  margin-bottom: 0;
}

/* 第二层：后台固定样式（独立于主题，不依赖任何 JSON） */

/* ============================================================
   admin.css - 后台管理界面固定样式
   不依赖任何动态主题，所有变量值写死
   通过 .admin-zone 类作用域隔离
   ============================================================ */

.admin-zone {
  /* ====== 颜色变量（固定值，直接使用十六进制等效值） ====== */
  --background: #f8fafc;
  --foreground: #0f172a;
  --card: #ffffff;
  --card-foreground: #0f172a;
  --popover: #ffffff;
  --popover-foreground: #0f172a;
  --primary: #10b981;
  --primary-foreground: #ffffff;
  --secondary: #334155;
  --secondary-foreground: #f8fafc;
  --muted: #f1f5f9;
  --muted-foreground: #64748b;
  --accent: #e2e8f0;
  --accent-foreground: #0f172a;
  --destructive: #ef4444;
  --destructive-foreground: #ffffff;
  --border: #e2e8f0;
  --input: #e2e8f0;
  --ring: #10b981;
  /* ====== 导航栏（固定深色） ====== */
  --navbar-bg: #0f172a;
  --navbar-text: #f8fafc;
  --navbar-hover-bg: #1e293b;
  --navbar-hover-text: #f8fafc;
  --navbar-active-text: #10b981;
  /* ====== 页脚（固定） ====== */
  --footer-bg: #0f172a;
  --footer-text: #94a3b8;
  --footer-link: #10b981;
  --footer-link-hover: #34d399;
  /* ====== 侧边栏 ====== */
  --sidebar: #0f172a;
  --sidebar-foreground: #f8fafc;
  --sidebar-primary: #10b981;
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: #1e293b;
  --sidebar-accent-foreground: #f8fafc;
  --sidebar-border: #1e293b;
  --sidebar-ring: #10b981;
  /* ====== 圆角 ====== */
  --radius: 0.625rem;
  /* ====== 字体 ====== */
  --font-sans: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, sans-serif;
  --font-serif: Georgia, Cambria, 'Times New Roman', serif;
  --font-mono: 'Courier New', monospace;
  /* ====== 阴影 ====== */
  --shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.1);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1);
  --shadow-2xl: 0 25px 50px -12px rgb(0 0 0 / 0.25);
  /* ====== 过渡动画 ====== */
  --transition-duration-150: 150ms;
  --transition-duration-200: 200ms;
  --transition-duration-300: 300ms;
  --transition-timing-ease: cubic-bezier(0.4, 0, 0.2, 1);
}

/* ====== 后台暗色模式 ====== */

.admin-zone.dark {
  --background: #020617;
  --foreground: #f8fafc;
  --card: #1e293b;
  --card-foreground: #f8fafc;
  --popover: #1e293b;
  --popover-foreground: #f8fafc;
  --primary: #34d399;
  --primary-foreground: #020617;
  --secondary: #334155;
  --secondary-foreground: #f8fafc;
  --muted: #1e293b;
  --muted-foreground: #94a3b8;
  --accent: #334155;
  --accent-foreground: #f8fafc;
  --border: #334155;
  --input: #334155;
  --ring: #34d399;
  --navbar-bg: #020617;
  --navbar-text: #f8fafc;
  --navbar-hover-bg: #0f172a;
  --sidebar: #020617;
  --sidebar-foreground: #f8fafc;
  --sidebar-border: #1e293b;
  --footer-bg: #020617;
  --footer-text: #94a3b8;
  --footer-link: #34d399;
}

/* ====== 后台基础布局（直接使用 var()，不包裹 hsl） ====== */

.admin-zone body {
  background-color: var(--background);
  color: var(--foreground);
}

.admin-zone * {
  border-color: var(--border);
}

/* 第三层：前台动态主题（由 layout.tsx 注入，此文件仅占位） */

/* 注意：不直接导入 frontend.css，因为它的内容由服务端动态生成 */

/* 但保留导入语句以便 IDE 识别路径，实际使用时会被 layout 覆盖 */

/* @import './styles/frontend.css';  ← 注释掉，由 layout.tsx 动态注入 */

.file\\:mr-4::file-selector-button{
  margin-right: 1rem;
}

.file\\:inline-flex::file-selector-button{
  display: inline-flex;
}

.file\\:h-6::file-selector-button{
  height: 1.5rem;
}

.file\\:rounded::file-selector-button{
  border-radius: 0.25rem;
}

.file\\:border-0::file-selector-button{
  border-width: 0px;
}

.file\\:bg-blue-50::file-selector-button{
  --tw-bg-opacity: 1;
  background-color: rgb(239 246 255 / var(--tw-bg-opacity, 1));
}

.file\\:bg-transparent::file-selector-button{
  background-color: transparent;
}

.file\\:px-4::file-selector-button{
  padding-left: 1rem;
  padding-right: 1rem;
}

.file\\:py-2::file-selector-button{
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
}

.file\\:text-sm::file-selector-button{
  font-size: 0.875rem;
  line-height: 1.25rem;
}

.file\\:font-medium::file-selector-button{
  font-weight: 500;
}

.file\\:text-blue-700::file-selector-button{
  --tw-text-opacity: 1;
  color: rgb(29 78 216 / var(--tw-text-opacity, 1));
}

.file\\:text-foreground::file-selector-button{
  color: var(--foreground);
}

.placeholder\\:text-muted-foreground::-moz-placeholder{
  color: var(--muted-foreground);
}

.placeholder\\:text-muted-foreground::placeholder{
  color: var(--muted-foreground);
}

.first\\:pt-0:first-child{
  padding-top: 0px;
}

.last\\:mb-0:last-child{
  margin-bottom: 0px;
}

.last\\:border-0:last-child{
  border-width: 0px;
}

.last\\:border-b-0:last-child{
  border-bottom-width: 0px;
}

.last\\:pb-0:last-child{
  padding-bottom: 0px;
}

.focus-within\\:ring-1:focus-within{
  --tw-ring-offset-shadow: var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color);
  --tw-ring-shadow: var(--tw-ring-inset) 0 0 0 calc(1px + var(--tw-ring-offset-width)) var(--tw-ring-color);
  box-shadow: var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow, 0 0 #0000);
}

.focus-within\\:ring-blue-500:focus-within{
  --tw-ring-opacity: 1;
  --tw-ring-color: rgb(59 130 246 / var(--tw-ring-opacity, 1));
}

.hover\\:-translate-y-1:hover{
  --tw-translate-y: -0.25rem;
  transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));
}

.hover\\:scale-105:hover{
  --tw-scale-x: 1.05;
  --tw-scale-y: 1.05;
  transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));
}

.hover\\:scale-110:hover{
  --tw-scale-x: 1.1;
  --tw-scale-y: 1.1;
  transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));
}

.hover\\:border-blue-300:hover{
  --tw-border-opacity: 1;
  border-color: rgb(147 197 253 / var(--tw-border-opacity, 1));
}

.hover\\:border-blue-400:hover{
  --tw-border-opacity: 1;
  border-color: rgb(96 165 250 / var(--tw-border-opacity, 1));
}

.hover\\:border-blue-500:hover{
  --tw-border-opacity: 1;
  border-color: rgb(59 130 246 / var(--tw-border-opacity, 1));
}

.hover\\:border-blue-600:hover{
  --tw-border-opacity: 1;
  border-color: rgb(37 99 235 / var(--tw-border-opacity, 1));
}

.hover\\:border-gray-300:hover{
  --tw-border-opacity: 1;
  border-color: rgb(209 213 219 / var(--tw-border-opacity, 1));
}

.hover\\:border-gray-400:hover{
  --tw-border-opacity: 1;
  border-color: rgb(156 163 175 / var(--tw-border-opacity, 1));
}

.hover\\:border-transparent:hover{
  border-color: transparent;
}

.hover\\:bg-\\[\\#383838\\]:hover{
  --tw-bg-opacity: 1;
  background-color: rgb(56 56 56 / var(--tw-bg-opacity, 1));
}

.hover\\:bg-\\[\\#f2f2f2\\]:hover{
  --tw-bg-opacity: 1;
  background-color: rgb(242 242 242 / var(--tw-bg-opacity, 1));
}

.hover\\:bg-\\[var\\(--navbar-hover-bg\\2c var\\(--accent\\2c \\#f1f5f9\\)\\)\\]:hover{
  background-color: var(--navbar-hover-bg,var(--accent,#f1f5f9));
}

.hover\\:bg-black\\/70:hover{
  background-color: rgb(0 0 0 / 0.7);
}

.hover\\:bg-blue-100:hover{
  --tw-bg-opacity: 1;
  background-color: rgb(219 234 254 / var(--tw-bg-opacity, 1));
}

.hover\\:bg-blue-200:hover{
  --tw-bg-opacity: 1;
  background-color: rgb(191 219 254 / var(--tw-bg-opacity, 1));
}

.hover\\:bg-blue-50:hover{
  --tw-bg-opacity: 1;
  background-color: rgb(239 246 255 / var(--tw-bg-opacity, 1));
}

.hover\\:bg-blue-600:hover{
  --tw-bg-opacity: 1;
  background-color: rgb(37 99 235 / var(--tw-bg-opacity, 1));
}

.hover\\:bg-blue-700:hover{
  --tw-bg-opacity: 1;
  background-color: rgb(29 78 216 / var(--tw-bg-opacity, 1));
}

.hover\\:bg-gray-100:hover{
  --tw-bg-opacity: 1;
  background-color: rgb(243 244 246 / var(--tw-bg-opacity, 1));
}

.hover\\:bg-gray-200:hover{
  --tw-bg-opacity: 1;
  background-color: rgb(229 231 235 / var(--tw-bg-opacity, 1));
}

.hover\\:bg-gray-300:hover{
  --tw-bg-opacity: 1;
  background-color: rgb(209 213 219 / var(--tw-bg-opacity, 1));
}

.hover\\:bg-gray-400:hover{
  --tw-bg-opacity: 1;
  background-color: rgb(156 163 175 / var(--tw-bg-opacity, 1));
}

.hover\\:bg-gray-50:hover{
  --tw-bg-opacity: 1;
  background-color: rgb(249 250 251 / var(--tw-bg-opacity, 1));
}

.hover\\:bg-gray-700:hover{
  --tw-bg-opacity: 1;
  background-color: rgb(55 65 81 / var(--tw-bg-opacity, 1));
}

.hover\\:bg-green-200:hover{
  --tw-bg-opacity: 1;
  background-color: rgb(187 247 208 / var(--tw-bg-opacity, 1));
}

.hover\\:bg-green-50:hover{
  --tw-bg-opacity: 1;
  background-color: rgb(240 253 244 / var(--tw-bg-opacity, 1));
}

.hover\\:bg-green-700:hover{
  --tw-bg-opacity: 1;
  background-color: rgb(21 128 61 / var(--tw-bg-opacity, 1));
}

.hover\\:bg-indigo-700:hover{
  --tw-bg-opacity: 1;
  background-color: rgb(67 56 202 / var(--tw-bg-opacity, 1));
}

.hover\\:bg-muted:hover{
  background-color: var(--muted);
}

.hover\\:bg-orange-50:hover{
  --tw-bg-opacity: 1;
  background-color: rgb(255 247 237 / var(--tw-bg-opacity, 1));
}

.hover\\:bg-purple-50:hover{
  --tw-bg-opacity: 1;
  background-color: rgb(250 245 255 / var(--tw-bg-opacity, 1));
}

.hover\\:bg-purple-700:hover{
  --tw-bg-opacity: 1;
  background-color: rgb(126 34 206 / var(--tw-bg-opacity, 1));
}

.hover\\:bg-red-100:hover{
  --tw-bg-opacity: 1;
  background-color: rgb(254 226 226 / var(--tw-bg-opacity, 1));
}

.hover\\:bg-red-50:hover{
  --tw-bg-opacity: 1;
  background-color: rgb(254 242 242 / var(--tw-bg-opacity, 1));
}

.hover\\:bg-red-700:hover{
  --tw-bg-opacity: 1;
  background-color: rgb(185 28 28 / var(--tw-bg-opacity, 1));
}

.hover\\:bg-white:hover{
  --tw-bg-opacity: 1;
  background-color: rgb(255 255 255 / var(--tw-bg-opacity, 1));
}

.hover\\:bg-white\\/20:hover{
  background-color: rgb(255 255 255 / 0.2);
}

.hover\\:bg-white\\/40:hover{
  background-color: rgb(255 255 255 / 0.4);
}

.hover\\:text-\\[var\\(--navbar-hover-text\\2c var\\(--primary\\2c \\#1e293b\\)\\)\\]:hover{
  color: var(--navbar-hover-text,var(--primary,#1e293b));
}

.hover\\:text-blue-500:hover{
  --tw-text-opacity: 1;
  color: rgb(59 130 246 / var(--tw-text-opacity, 1));
}

.hover\\:text-blue-600:hover{
  --tw-text-opacity: 1;
  color: rgb(37 99 235 / var(--tw-text-opacity, 1));
}

.hover\\:text-blue-700:hover{
  --tw-text-opacity: 1;
  color: rgb(29 78 216 / var(--tw-text-opacity, 1));
}

.hover\\:text-blue-800:hover{
  --tw-text-opacity: 1;
  color: rgb(30 64 175 / var(--tw-text-opacity, 1));
}

.hover\\:text-blue-900:hover{
  --tw-text-opacity: 1;
  color: rgb(30 58 138 / var(--tw-text-opacity, 1));
}

.hover\\:text-foreground:hover{
  color: var(--foreground);
}

.hover\\:text-gray-200:hover{
  --tw-text-opacity: 1;
  color: rgb(229 231 235 / var(--tw-text-opacity, 1));
}

.hover\\:text-gray-600:hover{
  --tw-text-opacity: 1;
  color: rgb(75 85 99 / var(--tw-text-opacity, 1));
}

.hover\\:text-gray-700:hover{
  --tw-text-opacity: 1;
  color: rgb(55 65 81 / var(--tw-text-opacity, 1));
}

.hover\\:text-gray-800:hover{
  --tw-text-opacity: 1;
  color: rgb(31 41 55 / var(--tw-text-opacity, 1));
}

.hover\\:text-gray-900:hover{
  --tw-text-opacity: 1;
  color: rgb(17 24 39 / var(--tw-text-opacity, 1));
}

.hover\\:text-green-600:hover{
  --tw-text-opacity: 1;
  color: rgb(22 163 74 / var(--tw-text-opacity, 1));
}

.hover\\:text-green-700:hover{
  --tw-text-opacity: 1;
  color: rgb(21 128 61 / var(--tw-text-opacity, 1));
}

.hover\\:text-green-800:hover{
  --tw-text-opacity: 1;
  color: rgb(22 101 52 / var(--tw-text-opacity, 1));
}

.hover\\:text-green-900:hover{
  --tw-text-opacity: 1;
  color: rgb(20 83 45 / var(--tw-text-opacity, 1));
}

.hover\\:text-indigo-900:hover{
  --tw-text-opacity: 1;
  color: rgb(49 46 129 / var(--tw-text-opacity, 1));
}

.hover\\:text-orange-600:hover{
  --tw-text-opacity: 1;
  color: rgb(234 88 12 / var(--tw-text-opacity, 1));
}

.hover\\:text-purple-700:hover{
  --tw-text-opacity: 1;
  color: rgb(126 34 206 / var(--tw-text-opacity, 1));
}

.hover\\:text-purple-800:hover{
  --tw-text-opacity: 1;
  color: rgb(107 33 168 / var(--tw-text-opacity, 1));
}

.hover\\:text-red-500:hover{
  --tw-text-opacity: 1;
  color: rgb(239 68 68 / var(--tw-text-opacity, 1));
}

.hover\\:text-red-600:hover{
  --tw-text-opacity: 1;
  color: rgb(220 38 38 / var(--tw-text-opacity, 1));
}

.hover\\:text-red-700:hover{
  --tw-text-opacity: 1;
  color: rgb(185 28 28 / var(--tw-text-opacity, 1));
}

.hover\\:text-red-800:hover{
  --tw-text-opacity: 1;
  color: rgb(153 27 27 / var(--tw-text-opacity, 1));
}

.hover\\:text-red-900:hover{
  --tw-text-opacity: 1;
  color: rgb(127 29 29 / var(--tw-text-opacity, 1));
}

.hover\\:text-white:hover{
  --tw-text-opacity: 1;
  color: rgb(255 255 255 / var(--tw-text-opacity, 1));
}

.hover\\:underline:hover{
  text-decoration-line: underline;
}

.hover\\:underline-offset-4:hover{
  text-underline-offset: 4px;
}

.hover\\:opacity-70:hover{
  opacity: 0.7;
}

.hover\\:opacity-80:hover{
  opacity: 0.8;
}

.hover\\:opacity-90:hover{
  opacity: 0.9;
}

.hover\\:shadow:hover{
  --tw-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
  --tw-shadow-colored: 0 1px 3px 0 var(--tw-shadow-color), 0 1px 2px -1px var(--tw-shadow-color);
  box-shadow: var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow);
}

.hover\\:shadow-lg:hover{
  --tw-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --tw-shadow-colored: 0 10px 15px -3px var(--tw-shadow-color), 0 4px 6px -4px var(--tw-shadow-color);
  box-shadow: var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow);
}

.hover\\:shadow-md:hover{
  --tw-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --tw-shadow-colored: 0 4px 6px -1px var(--tw-shadow-color), 0 2px 4px -2px var(--tw-shadow-color);
  box-shadow: var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow);
}

.hover\\:shadow-sm:hover{
  --tw-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --tw-shadow-colored: 0 1px 2px 0 var(--tw-shadow-color);
  box-shadow: var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow);
}

.hover\\:shadow-xl:hover{
  --tw-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
  --tw-shadow-colored: 0 20px 25px -5px var(--tw-shadow-color), 0 8px 10px -6px var(--tw-shadow-color);
  box-shadow: var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow);
}

.hover\\:ring-2:hover{
  --tw-ring-offset-shadow: var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color);
  --tw-ring-shadow: var(--tw-ring-inset) 0 0 0 calc(2px + var(--tw-ring-offset-width)) var(--tw-ring-color);
  box-shadow: var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow, 0 0 #0000);
}

.hover\\:file\\:bg-blue-100::file-selector-button:hover{
  --tw-bg-opacity: 1;
  background-color: rgb(219 234 254 / var(--tw-bg-opacity, 1));
}

.focus\\:border-blue-500:focus{
  --tw-border-opacity: 1;
  border-color: rgb(59 130 246 / var(--tw-border-opacity, 1));
}

.focus\\:border-green-500:focus{
  --tw-border-opacity: 1;
  border-color: rgb(34 197 94 / var(--tw-border-opacity, 1));
}

.focus\\:border-red-500:focus{
  --tw-border-opacity: 1;
  border-color: rgb(239 68 68 / var(--tw-border-opacity, 1));
}

.focus\\:border-transparent:focus{
  border-color: transparent;
}

.focus\\:border-yellow-500:focus{
  --tw-border-opacity: 1;
  border-color: rgb(234 179 8 / var(--tw-border-opacity, 1));
}

.focus\\:bg-accent:focus{
  background-color: var(--accent);
}

.focus\\:text-accent-foreground:focus{
  color: var(--accent-foreground);
}

.focus\\:outline-none:focus{
  outline: 2px solid transparent;
  outline-offset: 2px;
}

.focus\\:ring-1:focus{
  --tw-ring-offset-shadow: var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color);
  --tw-ring-shadow: var(--tw-ring-inset) 0 0 0 calc(1px + var(--tw-ring-offset-width)) var(--tw-ring-color);
  box-shadow: var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow, 0 0 #0000);
}

.focus\\:ring-2:focus{
  --tw-ring-offset-shadow: var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color);
  --tw-ring-shadow: var(--tw-ring-inset) 0 0 0 calc(2px + var(--tw-ring-offset-width)) var(--tw-ring-color);
  box-shadow: var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow, 0 0 #0000);
}

.focus\\:ring-blue-500:focus{
  --tw-ring-opacity: 1;
  --tw-ring-color: rgb(59 130 246 / var(--tw-ring-opacity, 1));
}

.focus\\:ring-green-500:focus{
  --tw-ring-opacity: 1;
  --tw-ring-color: rgb(34 197 94 / var(--tw-ring-opacity, 1));
}

.focus\\:ring-primary:focus{
  --tw-ring-color: var(--primary);
}

.focus\\:ring-purple-500:focus{
  --tw-ring-opacity: 1;
  --tw-ring-color: rgb(168 85 247 / var(--tw-ring-opacity, 1));
}

.focus\\:ring-red-500:focus{
  --tw-ring-opacity: 1;
  --tw-ring-color: rgb(239 68 68 / var(--tw-ring-opacity, 1));
}

.focus\\:ring-yellow-500:focus{
  --tw-ring-opacity: 1;
  --tw-ring-color: rgb(234 179 8 / var(--tw-ring-opacity, 1));
}

.focus-visible\\:border-ring:focus-visible{
  border-color: var(--ring);
}

.active\\:cursor-grabbing:active{
  cursor: grabbing;
}

.disabled\\:pointer-events-none:disabled{
  pointer-events: none;
}

.disabled\\:cursor-not-allowed:disabled{
  cursor: not-allowed;
}

.disabled\\:bg-gray-400:disabled{
  --tw-bg-opacity: 1;
  background-color: rgb(156 163 175 / var(--tw-bg-opacity, 1));
}

.disabled\\:opacity-30:disabled{
  opacity: 0.3;
}

.disabled\\:opacity-40:disabled{
  opacity: 0.4;
}

.disabled\\:opacity-50:disabled{
  opacity: 0.5;
}

.group:hover .group-hover\\:translate-x-1{
  --tw-translate-x: 0.25rem;
  transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));
}

.group:hover .group-hover\\:scale-105{
  --tw-scale-x: 1.05;
  --tw-scale-y: 1.05;
  transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));
}

.group:hover .group-hover\\:scale-110{
  --tw-scale-x: 1.1;
  --tw-scale-y: 1.1;
  transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));
}

.group:hover .group-hover\\:bg-black\\/10{
  background-color: rgb(0 0 0 / 0.1);
}

.group:hover .group-hover\\:bg-black\\/30{
  background-color: rgb(0 0 0 / 0.3);
}

.group:hover .group-hover\\:bg-black\\/40{
  background-color: rgb(0 0 0 / 0.4);
}

.group:hover .group-hover\\:bg-opacity-30{
  --tw-bg-opacity: 0.3;
}

.group:hover .group-hover\\:text-\\[var\\(--navbar-hover-text\\2c var\\(--primary\\2c \\#1e293b\\)\\)\\]{
  color: var(--navbar-hover-text,var(--primary,#1e293b));
}

.group:hover .group-hover\\:opacity-100{
  opacity: 1;
}

.peer:-moz-placeholder ~ .peer-placeholder-shown\\:top-3\\.5{
  top: 0.875rem;
}

.peer:placeholder-shown ~ .peer-placeholder-shown\\:top-3\\.5{
  top: 0.875rem;
}

.peer:-moz-placeholder ~ .peer-placeholder-shown\\:text-base{
  font-size: 1rem;
  line-height: 1.5rem;
}

.peer:placeholder-shown ~ .peer-placeholder-shown\\:text-base{
  font-size: 1rem;
  line-height: 1.5rem;
}

.peer:focus ~ .peer-focus\\:top-2{
  top: 0.5rem;
}

.peer:focus ~ .peer-focus\\:text-sm{
  font-size: 0.875rem;
  line-height: 1.25rem;
}

.peer:disabled ~ .peer-disabled\\:cursor-not-allowed{
  cursor: not-allowed;
}

.peer:disabled ~ .peer-disabled\\:opacity-50{
  opacity: 0.5;
}

.has-\\[\\>img\\:first-child\\]\\:pt-0:has(>img:first-child){
  padding-top: 0px;
}

.aria-expanded\\:bg-muted[aria-expanded="true"]{
  background-color: var(--muted);
}

.aria-expanded\\:bg-secondary[aria-expanded="true"]{
  background-color: var(--secondary);
}

.aria-expanded\\:text-foreground[aria-expanded="true"]{
  color: var(--foreground);
}

.aria-expanded\\:text-secondary-foreground[aria-expanded="true"]{
  color: var(--secondary-foreground);
}

.data-\\[size\\=default\\]\\:h-8[data-size="default"]{
  height: 2rem;
}

.data-\\[size\\=sm\\]\\:h-7[data-size="sm"]{
  height: 1.75rem;
}

.data-\\[position\\=popper\\]\\:w-full[data-position="popper"]{
  width: 100%;
}

.data-\\[side\\=bottom\\]\\:translate-y-1[data-side="bottom"]{
  --tw-translate-y: 0.25rem;
  transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));
}

.data-\\[side\\=left\\]\\:-translate-x-1[data-side="left"]{
  --tw-translate-x: -0.25rem;
  transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));
}

.data-\\[side\\=right\\]\\:translate-x-1[data-side="right"]{
  --tw-translate-x: 0.25rem;
  transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));
}

.data-\\[side\\=top\\]\\:-translate-y-1[data-side="top"]{
  --tw-translate-y: -0.25rem;
  transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));
}

.data-\\[align-trigger\\=true\\]\\:animate-none[data-align-trigger="true"]{
  animation: none;
}

.data-\\[size\\=sm\\]\\:gap-3[data-size="sm"]{
  gap: 0.75rem;
}

.data-\\[size\\=sm\\]\\:rounded-\\[min\\(var\\(--radius-md\\)\\2c 10px\\)\\][data-size="sm"]{
  border-radius: min(var(--radius-md), 10px);
}

.data-\\[state\\=active\\]\\:border-b-2[data-state="active"]{
  border-bottom-width: 2px;
}

.data-\\[state\\=active\\]\\:border-blue-600[data-state="active"]{
  --tw-border-opacity: 1;
  border-color: rgb(37 99 235 / var(--tw-border-opacity, 1));
}

.data-\\[state\\=active\\]\\:bg-blue-50[data-state="active"]{
  --tw-bg-opacity: 1;
  background-color: rgb(239 246 255 / var(--tw-bg-opacity, 1));
}

.data-\\[state\\=selected\\]\\:bg-muted[data-state="selected"]{
  background-color: var(--muted);
}

.data-\\[size\\=sm\\]\\:py-3[data-size="sm"]{
  padding-top: 0.75rem;
  padding-bottom: 0.75rem;
}

.data-\\[state\\=active\\]\\:text-blue-700[data-state="active"]{
  --tw-text-opacity: 1;
  color: rgb(29 78 216 / var(--tw-text-opacity, 1));
}

.data-\\[side\\=bottom\\]\\:slide-in-from-top-2[data-side="bottom"]{
  --tw-enter-translate-y: -0.5rem;
}

.data-\\[side\\=left\\]\\:slide-in-from-right-2[data-side="left"]{
  --tw-enter-translate-x: 0.5rem;
}

.data-\\[side\\=right\\]\\:slide-in-from-left-2[data-side="right"]{
  --tw-enter-translate-x: -0.5rem;
}

.data-\\[side\\=top\\]\\:slide-in-from-bottom-2[data-side="top"]{
  --tw-enter-translate-y: 0.5rem;
}

.\\*\\:data-\\[slot\\=select-value\\]\\:line-clamp-1[data-slot="select-value"] > *{
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
}

.\\*\\:data-\\[slot\\=select-value\\]\\:flex[data-slot="select-value"] > *{
  display: flex;
}

.\\*\\:data-\\[slot\\=select-value\\]\\:items-center[data-slot="select-value"] > *{
  align-items: center;
}

.\\*\\:data-\\[slot\\=select-value\\]\\:gap-1\\.5[data-slot="select-value"] > *{
  gap: 0.375rem;
}

.group[data-disabled="true"] .group-data-\\[disabled\\=true\\]\\:pointer-events-none{
  pointer-events: none;
}

.group\\/card[data-size="sm"] .group-data-\\[size\\=sm\\]\\/card\\:p-3{
  padding: 0.75rem;
}

.group\\/card[data-size="sm"] .group-data-\\[size\\=sm\\]\\/card\\:px-3{
  padding-left: 0.75rem;
  padding-right: 0.75rem;
}

.group\\/card[data-size="sm"] .group-data-\\[size\\=sm\\]\\/card\\:text-sm{
  font-size: 0.875rem;
  line-height: 1.25rem;
}

.group[data-disabled="true"] .group-data-\\[disabled\\=true\\]\\:opacity-50{
  opacity: 0.5;
}

.dark\\:border-input:is(.dark *){
  border-color: var(--input);
}

.dark\\:border-white\\/\\[\\.145\\]:is(.dark *){
  border-color: rgb(255 255 255 / .145);
}

.dark\\:bg-white\\/\\[\\.06\\]:is(.dark *){
  background-color: rgb(255 255 255 / .06);
}

.dark\\:invert:is(.dark *){
  --tw-invert: invert(100%);
  filter: var(--tw-blur) var(--tw-brightness) var(--tw-contrast) var(--tw-grayscale) var(--tw-hue-rotate) var(--tw-invert) var(--tw-saturate) var(--tw-sepia) var(--tw-drop-shadow);
}

.dark\\:hover\\:bg-\\[\\#1a1a1a\\]:hover:is(.dark *){
  --tw-bg-opacity: 1;
  background-color: rgb(26 26 26 / var(--tw-bg-opacity, 1));
}

.dark\\:hover\\:bg-\\[\\#ccc\\]:hover:is(.dark *){
  --tw-bg-opacity: 1;
  background-color: rgb(204 204 204 / var(--tw-bg-opacity, 1));
}

@media (min-width: 640px){
  .sm\\:col-span-1{
    grid-column: span 1 / span 1;
  }

  .sm\\:col-span-2{
    grid-column: span 2 / span 2;
  }

  .sm\\:col-span-4{
    grid-column: span 4 / span 4;
  }

  .sm\\:h-12{
    height: 3rem;
  }

  .sm\\:w-40{
    width: 10rem;
  }

  .sm\\:w-auto{
    width: auto;
  }

  .sm\\:max-w-sm{
    max-width: 24rem;
  }

  .sm\\:grid-cols-2{
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .sm\\:grid-cols-3{
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .sm\\:flex-row{
    flex-direction: row;
  }

  .sm\\:items-start{
    align-items: flex-start;
  }

  .sm\\:items-center{
    align-items: center;
  }

  .sm\\:justify-end{
    justify-content: flex-end;
  }

  .sm\\:justify-between{
    justify-content: space-between;
  }

  .sm\\:gap-4{
    gap: 1rem;
  }

  .sm\\:rounded-md{
    border-radius: calc(var(--radius) - 2px);
  }

  .sm\\:p-20{
    padding: 5rem;
  }

  .sm\\:p-4{
    padding: 1rem;
  }

  .sm\\:p-6{
    padding: 1.5rem;
  }

  .sm\\:px-2{
    padding-left: 0.5rem;
    padding-right: 0.5rem;
  }

  .sm\\:px-5{
    padding-left: 1.25rem;
    padding-right: 1.25rem;
  }

  .sm\\:px-6{
    padding-left: 1.5rem;
    padding-right: 1.5rem;
  }

  .sm\\:py-2{
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
  }

  .sm\\:py-3{
    padding-top: 0.75rem;
    padding-bottom: 0.75rem;
  }

  .sm\\:py-4{
    padding-top: 1rem;
    padding-bottom: 1rem;
  }

  .sm\\:py-6{
    padding-top: 1.5rem;
    padding-bottom: 1.5rem;
  }

  .sm\\:text-left{
    text-align: left;
  }

  .sm\\:text-base{
    font-size: 1rem;
    line-height: 1.5rem;
  }

  .sm\\:text-sm{
    font-size: 0.875rem;
    line-height: 1.25rem;
  }

  .sm\\:text-xl{
    font-size: 1.25rem;
    line-height: 1.75rem;
  }
}

@media (min-width: 768px){
  .md\\:sticky{
    position: sticky;
  }

  .md\\:top-8{
    top: 2rem;
  }

  .md\\:order-1{
    order: 1;
  }

  .md\\:order-2{
    order: 2;
  }

  .md\\:col-span-1{
    grid-column: span 1 / span 1;
  }

  .md\\:col-span-2{
    grid-column: span 2 / span 2;
  }

  .md\\:col-span-3{
    grid-column: span 3 / span 3;
  }

  .md\\:mb-4{
    margin-bottom: 1rem;
  }

  .md\\:mt-4{
    margin-top: 1rem;
  }

  .md\\:block{
    display: block;
  }

  .md\\:grid{
    display: grid;
  }

  .md\\:hidden{
    display: none;
  }

  .md\\:h-56{
    height: 14rem;
  }

  .md\\:h-64{
    height: 16rem;
  }

  .md\\:h-96{
    height: 24rem;
  }

  .md\\:h-\\[30rem\\]{
    height: 30rem;
  }

  .md\\:h-\\[80vh\\]{
    height: 80vh;
  }

  .md\\:max-h-\\[70vh\\]{
    max-height: 70vh;
  }

  .md\\:min-h-\\[500px\\]{
    min-height: 500px;
  }

  .md\\:w-1\\/2{
    width: 50%;
  }

  .md\\:w-1\\/3{
    width: 33.333333%;
  }

  .md\\:w-2\\/3{
    width: 66.666667%;
  }

  .md\\:w-2\\/5{
    width: 40%;
  }

  .md\\:w-3\\/5{
    width: 60%;
  }

  .md\\:w-56{
    width: 14rem;
  }

  .md\\:w-64{
    width: 16rem;
  }

  .md\\:w-72{
    width: 18rem;
  }

  .md\\:w-\\[158px\\]{
    width: 158px;
  }

  .md\\:w-auto{
    width: auto;
  }

  .md\\:w-full{
    width: 100%;
  }

  .md\\:grid-cols-2{
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .md\\:grid-cols-3{
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .md\\:grid-cols-4{
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .md\\:flex-row{
    flex-direction: row;
  }

  .md\\:flex-row-reverse{
    flex-direction: row-reverse;
  }

  .md\\:flex-col{
    flex-direction: column;
  }

  .md\\:items-center{
    align-items: center;
  }

  .md\\:items-stretch{
    align-items: stretch;
  }

  .md\\:justify-start{
    justify-content: flex-start;
  }

  .md\\:justify-end{
    justify-content: flex-end;
  }

  .md\\:justify-center{
    justify-content: center;
  }

  .md\\:justify-between{
    justify-content: space-between;
  }

  .md\\:gap-1{
    gap: 0.25rem;
  }

  .md\\:gap-16{
    gap: 4rem;
  }

  .md\\:gap-4{
    gap: 1rem;
  }

  .md\\:border-b-0{
    border-bottom-width: 0px;
  }

  .md\\:border-r{
    border-right-width: 1px;
  }

  .md\\:p-6{
    padding: 1.5rem;
  }

  .md\\:p-8{
    padding: 2rem;
  }

  .md\\:px-6{
    padding-left: 1.5rem;
    padding-right: 1.5rem;
  }

  .md\\:pb-12{
    padding-bottom: 3rem;
  }

  .md\\:text-left{
    text-align: left;
  }

  .md\\:text-3xl{
    font-size: 1.875rem;
    line-height: 2.25rem;
  }

  .md\\:text-sm{
    font-size: 0.875rem;
    line-height: 1.25rem;
  }
}

@media (min-width: 1024px){
  .lg\\:sticky{
    position: sticky;
  }

  .lg\\:top-0{
    top: 0px;
  }

  .lg\\:block{
    display: block;
  }

  .lg\\:hidden{
    display: none;
  }

  .lg\\:h-screen{
    height: 100vh;
  }

  .lg\\:w-1\\/4{
    width: 25%;
  }

  .lg\\:w-64{
    width: 16rem;
  }

  .lg\\:w-80{
    width: 20rem;
  }

  .lg\\:w-\\[var\\(--doc-sidebar-width\\2c 18\\.75rem\\)\\]{
    width: var(--doc-sidebar-width,18.75rem);
  }

  .lg\\:w-auto{
    width: auto;
  }

  .lg\\:grid-cols-2{
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .lg\\:grid-cols-3{
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .lg\\:grid-cols-4{
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .lg\\:grid-cols-5{
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }

  .lg\\:grid-cols-6{
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }

  .lg\\:grid-cols-\\[65\\%_30\\%\\]{
    grid-template-columns: 65% 30%;
  }

  .lg\\:flex-row{
    flex-direction: row;
  }

  .lg\\:border-b-0{
    border-bottom-width: 0px;
  }

  .lg\\:border-l{
    border-left-width: 1px;
  }

  .lg\\:border-r{
    border-right-width: 1px;
  }

  .lg\\:border-gray-200{
    --tw-border-opacity: 1;
    border-color: rgb(229 231 235 / var(--tw-border-opacity, 1));
  }

  .lg\\:p-8{
    padding: 2rem;
  }

  .lg\\:px-8{
    padding-left: 2rem;
    padding-right: 2rem;
  }

  .lg\\:py-10{
    padding-top: 2.5rem;
    padding-bottom: 2.5rem;
  }

  .lg\\:pb-16{
    padding-bottom: 4rem;
  }

  .lg\\:pl-6{
    padding-left: 1.5rem;
  }
}

@media print{
  .print\\:mb-6{
    margin-bottom: 1.5rem;
  }

  .print\\:block{
    display: block;
  }

  .print\\:hidden{
    display: none;
  }

  .print\\:border-gray-300{
    --tw-border-opacity: 1;
    border-color: rgb(209 213 219 / var(--tw-border-opacity, 1));
  }

  .print\\:bg-gray-100{
    --tw-bg-opacity: 1;
    background-color: rgb(243 244 246 / var(--tw-bg-opacity, 1));
  }

  .print\\:bg-white{
    --tw-bg-opacity: 1;
    background-color: rgb(255 255 255 / var(--tw-bg-opacity, 1));
  }

  .print\\:p-3{
    padding: 0.75rem;
  }

  .print\\:p-4{
    padding: 1rem;
  }

  .print\\:px-0{
    padding-left: 0px;
    padding-right: 0px;
  }

  .print\\:py-0{
    padding-top: 0px;
    padding-bottom: 0px;
  }

  .print\\:py-4{
    padding-top: 1rem;
    padding-bottom: 1rem;
  }

  .print\\:shadow-none{
    --tw-shadow: 0 0 #0000;
    --tw-shadow-colored: 0 0 #0000;
    box-shadow: var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow);
  }
}

.\\[\\&\\:has\\(\\[role\\=checkbox\\]\\)\\]\\:pr-0:has([role=checkbox]){
  padding-right: 0px;
}

.\\[\\&\\>tr\\]\\:last\\:border-b-0:last-child>tr{
  border-bottom-width: 0px;
}

.\\[\\&_\\.ProseMirror\\>\\*\\:first-child\\]\\:mt-0 .ProseMirror>*:first-child{
  margin-top: 0px;
}

.\\[\\&_\\.ProseMirror\\>\\*\\:last-child\\]\\:mb-0 .ProseMirror>*:last-child{
  margin-bottom: 0px;
}

.\\[\\&_\\.ProseMirror\\]\\:p-0 .ProseMirror{
  padding: 0px;
}

.\\[\\&_\\.ProseMirror\\]\\:outline-none .ProseMirror{
  outline: 2px solid transparent;
  outline-offset: 2px;
}

.\\[\\&_\\.ProseMirror_\\.column-resize-handle\\]\\:w-0\\.5 .ProseMirror .column-resize-handle{
  width: 0.125rem;
}

.\\[\\&_\\.ProseMirror_\\.column-resize-handle\\]\\:bg-blue-500 .ProseMirror .column-resize-handle{
  --tw-bg-opacity: 1;
  background-color: rgb(59 130 246 / var(--tw-bg-opacity, 1));
}

.\\[\\&_\\.ProseMirror_\\.selectedCell\\]\\:bg-blue-50 .ProseMirror .selectedCell{
  --tw-bg-opacity: 1;
  background-color: rgb(239 246 255 / var(--tw-bg-opacity, 1));
}

.\\[\\&_\\.ProseMirror_img\\.ProseMirror-selectednode\\]\\:ring-2 .ProseMirror img.ProseMirror-selectednode{
  --tw-ring-offset-shadow: var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color);
  --tw-ring-shadow: var(--tw-ring-inset) 0 0 0 calc(2px + var(--tw-ring-offset-width)) var(--tw-ring-color);
  box-shadow: var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow, 0 0 #0000);
}

.\\[\\&_\\.ProseMirror_img\\.ProseMirror-selectednode\\]\\:ring-blue-500 .ProseMirror img.ProseMirror-selectednode{
  --tw-ring-opacity: 1;
  --tw-ring-color: rgb(59 130 246 / var(--tw-ring-opacity, 1));
}

.\\[\\&_\\.ProseMirror_img\\]\\:h-auto .ProseMirror img{
  height: auto;
}

.\\[\\&_\\.ProseMirror_img\\]\\:max-w-full .ProseMirror img{
  max-width: 100%;
}

.\\[\\&_\\.ProseMirror_img\\]\\:cursor-pointer .ProseMirror img{
  cursor: pointer;
}

.\\[\\&_\\.ProseMirror_img\\]\\:rounded .ProseMirror img{
  border-radius: 0.25rem;
}

.\\[\\&_\\.ProseMirror_table\\]\\:my-4 .ProseMirror table{
  margin-top: 1rem;
  margin-bottom: 1rem;
}

.\\[\\&_\\.ProseMirror_table\\]\\:w-full .ProseMirror table{
  width: 100%;
}

.\\[\\&_\\.ProseMirror_table\\]\\:border-collapse .ProseMirror table{
  border-collapse: collapse;
}

.\\[\\&_\\.ProseMirror_td\\]\\:border .ProseMirror td{
  border-width: 1px;
}

.\\[\\&_\\.ProseMirror_td\\]\\:border-gray-300 .ProseMirror td{
  --tw-border-opacity: 1;
  border-color: rgb(209 213 219 / var(--tw-border-opacity, 1));
}

.\\[\\&_\\.ProseMirror_td\\]\\:p-2 .ProseMirror td{
  padding: 0.5rem;
}

.\\[\\&_\\.ProseMirror_td\\]\\:align-top .ProseMirror td{
  vertical-align: top;
}

.\\[\\&_\\.ProseMirror_th\\]\\:border .ProseMirror th{
  border-width: 1px;
}

.\\[\\&_\\.ProseMirror_th\\]\\:border-gray-300 .ProseMirror th{
  --tw-border-opacity: 1;
  border-color: rgb(209 213 219 / var(--tw-border-opacity, 1));
}

.\\[\\&_\\.ProseMirror_th\\]\\:bg-gray-50 .ProseMirror th{
  --tw-bg-opacity: 1;
  background-color: rgb(249 250 251 / var(--tw-bg-opacity, 1));
}

.\\[\\&_\\.ProseMirror_th\\]\\:p-2 .ProseMirror th{
  padding: 0.5rem;
}

.\\[\\&_\\.ProseMirror_th\\]\\:text-left .ProseMirror th{
  text-align: left;
}

.\\[\\&_\\.ProseMirror_th\\]\\:font-semibold .ProseMirror th{
  font-weight: 600;
}

.\\[\\&_svg\\:not\\(\\[class\\*\\=\\'size-\\'\\]\\)\\]\\:size-3 svg:not([class*='size-']){
  width: 0.75rem;
  height: 0.75rem;
}

.\\[\\&_svg\\:not\\(\\[class\\*\\=\\'size-\\'\\]\\)\\]\\:size-3\\.5 svg:not([class*='size-']){
  width: 0.875rem;
  height: 0.875rem;
}

.\\[\\&_svg\\:not\\(\\[class\\*\\=\\'size-\\'\\]\\)\\]\\:size-4 svg:not([class*='size-']){
  width: 1rem;
  height: 1rem;
}

.\\[\\&_svg\\]\\:pointer-events-none svg{
  pointer-events: none;
}

.\\[\\&_svg\\]\\:shrink-0 svg{
  flex-shrink: 0;
}

.\\[\\&_tr\\:last-child\\]\\:border-0 tr:last-child{
  border-width: 0px;
}

.\\[\\&_tr\\]\\:border-b tr{
  border-bottom-width: 1px;
}`;
