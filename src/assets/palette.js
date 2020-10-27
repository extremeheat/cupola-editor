/**
 * @typedef {object} PaletteCommand~Command
 * @property {string|symbol} name - Name of command (print in palette after category name)
 * @property {string} [description] - Detail text for explain action of command
 * @property {function} action - Callback when user press `Enter` on command when selected
 */

/**
 * @callback PaletteCommand~ConstructorOptionsShortcut
 * @param {KeyboardEvent} event - keypress event from document
 * @return {boolean} - return true if keypress event is your shortcut
 */

/**
 * @callback PaletteCommand~ConstructorOptionsNavigation
 * @param {KeyboardEvent} event - keypress event from document
 * @this {PaletteCommand}
 */

/**
 * @typedef {object} PaletteCommand~ConstructorOptions
 * @property {string} [cssClass] - add if you want stylize the palette with your own css ;-)
 * @property {PaletteCommand~ConstructorOptionsShortcut} [isShortcut] - take a KeyboardEvent and return if right shortcut, by default the shortcut is ctrl-alt-p
 * @property {PaletteCommand~ConstructorOptionsNavigation} [navigationCallback] - take a KeyboardEvent and execute your navigation
 */

/**
 * @type {number}
 * @private
 */
let sequence = 0;

/**
 * @type {PaletteCommand~ConstructorOptions}
 * @private
 */
const defaultOptions = {
  isShortcut: event => event.ctrlKey && event.altKey && event.key === 'p',
  navigationCallback(event) {
    switch (event.key) {
      case 'ArrowDown':
        this.next();
        break;
      case 'ArrowUp':
        this.prev();
        break;
      case 'Enter':
        this.dispatch();
        break;
    }
  }
};

/**
 * @property {PaletteCommand~ConstructorOptions} options - Merged options (Object.assign) you give to constructor with default options
 */
class PaletteCommand {

  /**
   * @returns {number}
   * @private
   */
  static get _sequence() {
    return sequence++;
  }

  /**
   * Default options is litteraly
   *
   * ```javascript
   *
   * const defaultOptions = {
   *  isShortcut: event => event.ctrlKey && event.altKey && event.key === 'p',
   *  navigationCallback(event) {
   *    switch (event.key) {
   *      case 'ArrowDown':
   *        this.next();
   *        break;
   *      case 'ArrowUp':
   *        this.prev();
   *        break;
   *      case 'Enter':
   *        this.dispatch();
   *        break;
   *    }
   *  }
   * }
   * ```
   *
   * @param {PaletteCommand~ConstructorOptions} [options={}] - Options for palette
   *
   * @example {@lang javascript}
   * // add `cmd-palette--custom` class to classlist of root command-palette dom element
   * new PaletteCommand({
   *  cssClass: 'cmd-palette--custom'
   * });
   *
   * // use ctrl+alt+m ShortCut for display palette
   * new PaletteCommand({
   *  isShortcut: e => e.ctrlKey && e.altKey && e.key === 'm'
   * });
   *
   * // shift+ArrowDown or shift+ArrowUp for navigate 5 by 5
   * new PaletteCommand({
   *  navigationCallback(event) {
   *    switch(event.key) {
   *      case 'ArrowDown':
   *        event.shiftKey
   *          ? (this.next(), this.next(), this.next(), this.next(), this.next())
   *          : this.next();
   *        break;
   *      case 'ArrowUp':
   *        event.shiftKey
   *          ? (this.prev(), this.prev(), this.prev(), this.prev(), this.prev())
   *          : this.prev();
   *        break;
   *      case 'Enter':
   *        this.dispatch();
   *        break;
   *    }
   *  }
   * );
   */
  constructor(options = {}) {
    this.categories = {
      '': {}
    };
    this._id = PaletteCommand._sequence;
    this.options = Object.assign({}, defaultOptions, options);
    this._initEvent();
  }

  /**
   * If no category specified, merge commands in generic category
   * else replace existent category (if exist) with this set of commands
   *
   * @param {PaletteCommand~Command[]} commands
   * @param {string|symbol} [category='']
   *
   * @example {@lang javascript}
   * // add commands to default context
   * palette.setCategory([
   *  {
   *    name: 'foo',
   *    description: 'log `foo` in console'
   *    action() {
   *      console.log('foo');
   *    }
   *  }
   * ]);
   *
   * // replace `Bar` context
   * palette.setCategory([
   *  {
   *    name: 'foo',
   *    description: 'log `foo` in console'
   *    action() {
   *      console.log('foo');
   *    }
   *  }
   * ], 'Bar');
   */
  setCategory(commands = [], category = '') {
    const context = category ? {} : this.categories[category];
    commands.forEach(cmd => context[cmd.name] = cmd);

    this.categories[category] = context;
  }

  /**
   * @param {string|symbol} category
   */
  removeCategory(category) {
    if (!category) return;
    if (!category in this.categories) return;

    delete this.categories[category];
  }

  /**
   * Add list (or single) Command to the category
   *
   * @param {PaletteCommand~Command | PaletteCommand~Command[]} commands
   * @param {string|symbol} [category=''] - Generic category if not specified
   */
  addToCategory(commands, category = '') {
    this.categories[category] || (this.categories[category] = {});

    if (Array.isArray(commands)) {
      commands.forEach(command => this.categories[category][command.name] = command);
    } else {
      this.categories[category][commands.name] = commands;
    }
  }

  /**
   * @returns {HTMLElement}
   * @private
   */
  _findDom() {
    return document.getElementById(`cmd-palette-${this._id}`);
  }

  /**
   * @returns {string[]}
   * @private
   */
  _generateCommandDOM() {
    const commands = [];

    for (let [category, context] of Object.entries(this.categories)) {
      for (let [name, command] of Object.entries(context)) {
        commands.push({
          ...command, category, name,
          title: `${category ? `${category}: ` : ''}${name}`,
        });
      }
    }

    return commands
      .sort((a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title))
      .map((cmd, idx) => `
        <li data-category="${cmd.category}" data-name="${cmd.name}"${idx === 0 ? ' selected' : ''}>
          <span class="title">${cmd.title}</span>
          <span class="description">${cmd.description}</span>
        </li>
      `);
  }

  /**
   * @returns {HTMLElement}
   * @private
   */
  _generateDom() {
    document.body.insertAdjacentHTML('afterbegin', `
      <div id="cmd-palette-${this._id}" class="cmd-palette${this.options.cssClass ? ' ' + this.options.cssClass : ''} cmd-palette--hide">
        <input type="text" placeholder="Search Command">
        <ul>
          ${this._generateCommandDOM().join('\n')}
        </ul>
      </div>
    `);

    const dom = this._findDom();
    dom.querySelector('input').addEventListener('keyup', event => this.search(event.target.value));

    return dom;
  }

  /**
   * @returns {HTMLElement}
   * @private
   */
  _findOrGenerateDom() {
    return this._findDom() || this._generateDom();
  }

  /**
   * lazy load the command palette and display it
   */
  show() {
    const dom = this._findOrGenerateDom();
    dom.classList.replace('cmd-palette--hide', 'cmd-palette--show');
    dom.querySelector('input').focus();
  }

  /**
   * lazy load the command palette and hide it
   */
  hide() {
    const dom = this._findOrGenerateDom();
    dom.classList.replace('cmd-palette--show', 'cmd-palette--hide');
  }

  /**
   * lazy load the command palette and return if it display
   *
   * @returns {boolean}
   */
  isShow() {
    return this._findOrGenerateDom().classList.contains('cmd-palette--show');
  }

  /**
   * lazy load the command palette and return if it not display
   *
   * @returns {boolean}
   */
  isHide() {
    return this._findOrGenerateDom().classList.contains('cmd-palette--hide');
  }

  /**
   * return selected element in list of commands
   *
   * @returns {Element | null}
   * @private
   */
  _getSelectedDomItem() {
    return this._findOrGenerateDom().querySelector('li[selected]');
  }

  /**
   * lazy load the palette
   * and select next item in command list
   */
  next() {
    if (this.isHide()) return;

    const oldSelected = this._getSelectedDomItem();
    if (!oldSelected) return;
    let selected = oldSelected;

    while (selected.nextElementSibling) {
      selected = selected.nextElementSibling;

      if (selected.matches('.cmd-palette-item--hide')) continue;
      break;
    }

    oldSelected.removeAttribute('selected');
    selected.setAttribute('selected', 'selected');

    PaletteCommand._scrollTo(selected);
  }

  /**
   * lazy load the palette
   * and select previous item in command list
   */
  prev() {
    if (this.isHide()) return;

    const oldSelected = this._getSelectedDomItem();
    if (!oldSelected) return;
    let selected = oldSelected;

    while (selected.previousElementSibling) {
      selected = selected.previousElementSibling;

      if (selected.classList.contains('cmd-palette-item--hide')) continue;
      break;
    }

    oldSelected.removeAttribute('selected');
    selected.setAttribute('selected', 'selected');

    PaletteCommand._scrollTo(selected);
  }

  /**
   * @param {HTMLElement|Element} selected
   * @private
   */
  static _scrollTo(selected) {
    if (!selected) return;
    if (!selected.parentElement) return;

    const itemHeight = selected.clientHeight;
    const scrollTopSelectedTopMax = selected.offsetTop - itemHeight;

    selected.parentElement.scrollTop = scrollTopSelectedTopMax - (2 * itemHeight);
  }

  /**
   * fuzzy searching
   *
   * @param {string} search
   * @param {string} term
   * @returns {boolean}
   * @private
   */
  static _fuzzySearch(search, term) {
    let hay = term.toLowerCase(), i = 0, n = -1, l;
    search = search.toLowerCase();
    for (; l = search[i++];) if (!~(n = hay.indexOf(l, n + 1))) return false;
    return true;
  }

  /**
   * lazy load palette
   * and hide items whose not respect the fuzzySearch terms
   *
   * @param {string} text
   */
  search(text) {
      return;////
    if (this.isHide()) return;
    text = text.trim();

    const dom = this._findOrGenerateDom();
    const items = [...dom.querySelectorAll('li')];

    if (!text) {
      items.forEach(li => li.classList.remove('cmd-palette-item--hide'));
    } else {
      items.forEach(li => {
        if (PaletteCommand._fuzzySearch(text, li.querySelector('.title').textContent)) {
          li.classList.remove('cmd-palette-item--hide');
        } else {
          li.classList.add('cmd-palette-item--hide');
        }
      });
    }

    dom.querySelector('li[selected].cmd-palette-item--hide') && this.prev();
    dom.querySelector('li[selected].cmd-palette-item--hide') && this.next();
  }

  /**
   * lazy load palette
   * and run selected command
   */
  dispatch() {
    if (this.isHide()) return;

    const dom = this._findOrGenerateDom();
    const item = dom.querySelector('li[selected]:not(.cmd-palette-item--hide)');
    if (!item) return;

    const {category = '', name} = item.dataset;
    const context = this.categories[category];
    if (!context) return;

    const command = context[name];
    if (!command) return;

    typeof command.action === 'function' && command.action();
    this.hide();
  }

  /**
   * place some events handler in document
   *
   * @private
   */
  _initEvent() {
    this._docClickHide = event => {
      if (event.target.matches('.cmd-palette') || event.target.closest('.cmd-palette')) return;

      this.hide();
    };

    this._docKeyPressShow = evt => this.options.isShortcut(evt) && this.show();
    this._docKeyPressNav = evt => {
      if (this.isHide()) return;

      this.options.navigationCallback.call(this, evt);
    };

    document.addEventListener('click', this._docClickHide);
    document.addEventListener('keypress', this._docKeyPressShow);
    document.addEventListener('keypress', this._docKeyPressNav);
  }

  /**
   * Remove PaletteCommand from DOM
   */
  destroy() {
    document.removeEventListener('click', this._docClickHide);
    document.removeEventListener('keypress', this._docKeyPressShow);
    document.removeEventListener('keypress', this._docKeyPressNav);

    const dom = this._findDom();
    dom.parentNode.removeChild(dom);
  }
}

// export default PaletteCommand;