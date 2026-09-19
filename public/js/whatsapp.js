(function () {
  const fab = document.getElementById('wa-fab');
  const popup = document.getElementById('wa-popup');
  const closeBtn = document.getElementById('wa-close');
  if (!fab || !popup) return;

  function openPopup() {
    popup.hidden = false;
    fab.setAttribute('aria-expanded', 'true');
  }

  function closePopup() {
    popup.hidden = true;
    fab.setAttribute('aria-expanded', 'false');
  }

  fab.addEventListener('click', function () {
    if (popup.hidden) openPopup();
    else closePopup();
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', closePopup);
  }
})();
