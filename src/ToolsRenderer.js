export const ToolsDomRenderer = (element, props) => {
  if (!element || !props?.state) {
    return;
  }

  element.innerHTML = `
    <div id="tools-container" class="tools-panel" style="font-size: 9px">
      <h3>Gen 3 OU Tools</h3>
      <pre>${props.state.opponentTeam}</pre>
      <hr>
      <pre>${JSON.stringify(props.state.smogonChaos, null, 2)}</pre>
      <hr>
      <pre>${props.state.smogonLeads}</pre>
      <hr>
      <pre>${JSON.stringify(props.state, null, 2)}</pre>
    </div>
  `;
}