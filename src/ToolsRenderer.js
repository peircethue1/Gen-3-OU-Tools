/**
 * 
 * EDITINGNOTE: NOT REVIEWED
 */

export const ToolsDomRenderer = (element, props) => {
  if (!element || !props?.state) {
    return;
  }

  const toolsState = JSON.stringify(props.state, null, 2);

  element.innerHTML = `
    <div id="tools-container" class="tools-panel" style="font-size: 9px">
      <h3>Gen 3 OU Tools</h3>
      <pre>${toolsState}</pre>
    </div>
  `;
}