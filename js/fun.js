// ============================================
// MapOfSounds — Fun Zone Controller v3.0
// ============================================
// Sub-tab controller for Ambient Mix & Journeys

const Fun = {
  activeSubTab: 'mix',

  /** Switch between Mix and Journey sub-tabs */
  showSubTab(tab) {
    this.activeSubTab = tab;

    // Update sub-tab buttons
    document.querySelectorAll('#page-fun .sub-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.subtab === tab);
    });

    // Toggle panels
    const mixPanel = document.getElementById('fun-mix-panel');
    const journeyPanel = document.getElementById('fun-journey-panel');

    if (mixPanel) mixPanel.classList.toggle('hidden', tab !== 'mix');
    if (journeyPanel) journeyPanel.classList.toggle('hidden', tab !== 'journey');

    // Init the active panel
    if (tab === 'mix') {
      AmbientMix.render();
    } else if (tab === 'journey') {
      Journey.renderList();
    }
  }
};
