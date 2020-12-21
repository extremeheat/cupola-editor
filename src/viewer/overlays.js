function setSuggestedActions(actions) {
  console.assert(Array.isArray(actions))
  let html = ''
  let i = 0
  for (var action of actions) {
    html += `
        <span class="text-overlay" onclick="">
            ${action.title}
        </span>`
  }
  document.querySelector('.bottom-overlay').innerHTML = html
}

// setSuggestedActions([ { title: 'Confirm selection (Enter)' } ])