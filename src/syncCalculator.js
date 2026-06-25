/**
 * 
 * EDITINGNOTE: Building...
 */

export function syncCalculator() {
  const opponentKey = this.toolsState.opponentKey
  const activeHP = this.battle[opponentKey]?.active?.[0]?.hp

  const stepIndex = this.battle.currentStep;
  const stepText = this.battle.stepQueue?.[stepIndex];

  const pastSteps = this.toolsState.stepHistory || [];
  const updatedStepHistory = [...pastSteps, `${activeHP}: ${stepText}`]

  this.toolsState.stepHistory = updatedStepHistory
}