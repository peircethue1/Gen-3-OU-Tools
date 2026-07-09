import * as React from 'react';

// Central indicator styling for black-boxed UI components
const baseStubStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '2px dashed #e67e22',
  backgroundColor: 'rgba(230, 126, 34, 0.1)',
  color: '#e67e22',
  padding: '6px 10px',
  borderRadius: '4px',
  fontFamily: 'monospace',
  fontSize: '11px',
  fontWeight: 'bold',
  gap: '6px'
};

/**
 * Player Picon Button Mock
 * Displays a clickable slot identifier for activating individual Pokemon.
 */
export const PlayerPiconButton = ({ pokemon, itemIndex, onPress }) => (
  <button
    type="button"
    onClick={onPress}
    style={{
      ...baseStubStyle,
      cursor: 'pointer',
      width: '50px',
      height: '50px',
      flexDirection: 'column',
      fontSize: '10px',
      borderColor: pokemon ? '#2ecc71' : '#7f8c8d',
      backgroundColor: pokemon ? 'rgba(46, 204, 113, 0.1)' : 'rgba(127, 140, 141, 0.1)',
      color: pokemon ? '#2ecc71' : '#7f8c8d'
    }}
  >
    <span>PKMN</span>
    <span>{pokemon ? (pokemon.speciesForme || pokemon.toolsId) : `[#${itemIndex ?? '?'}]`}</span>
  </button>
);

/**
 * Droppable Grid Mock
 * Emulates the multi-slot roster wrapper, rendering internal listed item IDs plus structural children.
 */
export const DroppableGrid = ({ itemIds, renderItem, children, containerClassName }) => (
  <div 
    className={containerClassName} 
    style={{ 
      display: 'flex', 
      gap: '6px', 
      padding: '6px', 
      border: '2px dashed #e74c3c', 
      backgroundColor: 'rgba(231, 76, 60, 0.05)', 
      borderRadius: '4px',
      alignItems: 'center'
    }}
  >
    <div style={{ fontSize: '9px', color: '#e74c3c', fontFamily: 'monospace', fontWeight: 'bold' }}>[Roster Grid]</div>
    {itemIds.map((id, index) => renderItem(id, { itemIndex: index }))}
    {children}
  </div>
);

/**
 * Tools Pokemon Sub-Context Mock Provider
 */
export const ToolsPokeProvider = ({ children, playerKey }) => (
  <div style={{ border: '2px dashed #1abc9c', backgroundColor: 'rgba(26, 188, 156, 0.02)', padding: '6px', borderRadius: '4px', marginTop: '6px' }}>
    <div style={{ fontSize: '9px', color: '#1abc9c', fontFamily: 'monospace', marginBottom: '4px' }}>
      [ToolsPokeProvider Context: {playerKey}]
    </div>
    {children}
  </div>
);

/**
 * Player Meta Info Tag Bar Mock
 */
export const PlayerInfo = ({ position, playerKey, defaultName, className }) => (
  <div 
    className={className}
    style={{ 
      ...baseStubStyle, 
      borderColor: '#34495e', 
      backgroundColor: 'rgba(52, 73, 94, 0.1)', 
      color: '#34495e' 
    }}
  >
    {defaultName || 'Player'} ({playerKey}) | Pos: {position || 'none'}
  </div>
);

/**
 * Core Pokemon Stat / Move Calculator Workspace Block Mock
 */
export const PokeCalc = ({ className }) => (
  <div 
    className={className}
    style={{ 
      ...baseStubStyle, 
      display: 'block',
      width: '100%', 
      borderColor: '#9b59b6', 
      backgroundColor: 'rgba(155, 89, 182, 0.1)', 
      color: '#9b59b6',
      textAlign: 'center',
      padding: '20px 10px'
    }}
  >
    <div>[PokeCalc Panel Workspace]</div>
    <span style={{ fontSize: '10px', opacity: 0.7 }}>Stats, Moves, and Damage Spreads Render Here</span>
  </div>
);

/**
 * Scrollable Component Wrapper
 */
export const Scrollable = ({ children, className, style }) => (
  <div
    className={className}
    style={{
      overflowY: 'auto',
      maxHeight: '100%',
      width: '100%',
      border: '2px dashed #3498db',
      backgroundColor: 'rgba(52, 152, 219, 0.05)',
      borderRadius: '4px',
      padding: '8px',
      boxSizing: 'border-box',
      ...style
    }}
  >
    <div style={{ fontSize: '10px', fontFamily: 'monospace', color: '#3498db', fontWeight: 'bold', marginBottom: '4px' }}>
      [Scrollable Content Container]
    </div>
    {children}
  </div>
);

/**
 * Custom Dropdown Mock
 */
export const Dropdown = ({ input, options, disabled, style }) => (
  <div 
    style={{ 
      ...baseStubStyle, 
      display: 'flex', 
      width: '100%', 
      borderColor: input?.value ? '#2ecc71' : '#e67e22',
      backgroundColor: input?.value ? 'rgba(46, 204, 113, 0.1)' : 'rgba(230, 126, 34, 0.1)',
      color: input?.value ? '#2ecc71' : '#e67e22',
      ...style 
    }}
  >
    <span>[Dropdown]</span>
    <select
      name={input?.name}
      value={input?.value || ''}
      disabled={disabled}
      onChange={(e) => input?.onChange?.(e.target.value || null)}
      onBlur={input?.onBlur}
      onFocus={input?.onFocus}
      style={{ cursor: disabled ? 'not-allowed' : 'pointer', background: 'transparent', color: 'inherit', border: '1px solid currentColor', borderRadius: '2px' }}
    >
      <option value="" style={{ color: '#000' }}>None (Hint)</option>
      {options?.map((opt) => (
        <option key={opt.value} value={opt.value} style={{ color: '#000' }}>
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);

/**
 * Spikes Multi-Layer Field Toggle
 */
export const SpikesField = ({ input, disabled, toggleActive }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={() => {
      const currentLayers = Number(input?.value || 0);
      const nextLayers = currentLayers >= 3 ? null : currentLayers + 1;
      input?.onChange?.(nextLayers);
    }}
    onBlur={input?.onBlur}
    onFocus={input?.onFocus}
    style={{
      ...baseStubStyle,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.4 : 1,
      borderColor: toggleActive ? '#2ecc71' : '#e67e22',
      backgroundColor: toggleActive ? 'rgba(46, 204, 113, 0.1)' : 'rgba(230, 126, 34, 0.1)',
      color: toggleActive ? '#2ecc71' : '#e67e22',
    }}
  >
    [Spikes: {input?.value || 0}/3]
  </button>
);

/**
 * Standard State Condition Toggle Button
 */
export const ToggleButton = ({ label, active, disabled, onPress }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onPress}
    style={{
      ...baseStubStyle,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.4 : 1,
      borderColor: active ? '#2ecc71' : '#e67e22',
      backgroundColor: active ? 'rgba(46, 204, 113, 0.1)' : 'rgba(230, 126, 34, 0.1)',
      color: active ? '#2ecc71' : '#e67e22',
    }}
  >
    [{label}: {active ? 'ON' : 'OFF'}]
  </button>
);

/**
 * Structural 3-Column Layout Shell Grid
 */
export const TableGrid = ({ children, className, style }) => (
  <div
    className={className}
    style={{
      display: 'grid',
      gridTemplateColumns: '1fr 120px 1fr',
      gap: '8px',
      padding: '12px',
      border: '2px dashed #9b59b6',
      backgroundColor: 'rgba(155, 89, 182, 0.05)',
      borderRadius: '6px',
      ...style,
    }}
  >
    {children}
  </div>
);

/**
 * Atomic Cell Wrapper for the Structural Grid
 */
export const TableGridItem = ({ children, className, align }) => {
  let justifyValue = 'center';
  if (align === 'left') justifyValue = 'flex-start';
  if (align === 'right') justifyValue = 'flex-end';

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: justifyValue,
        justifyContent: 'center',
        padding: '4px',
        minHeight: '32px'
      }}
    >
      {children}
    </div>
  );
};