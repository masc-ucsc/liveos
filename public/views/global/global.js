function live_tab_holder (tab_class) {
  var self = this;
  this.tab_class = tab_class;
  this.tab_buttons = new Object();
  this.tabs = new Object();

  this.container = document.createElement('div');
  this.tab_bar = document.createElement('div');
  this.tab_bar.className = 'live_tab_bar';
  this.container.appendChild(this.tab_bar);

  this.add_tab = function (name, title) {
    var b = document.createElement('div');
    b.className = 'live_tab_button';
    if(Object.keys(self.tabs).length > 0)
      b.className += ' live_tab_button_us';
    b.innerHTML = title;
    b.onclick = function () {
      self.activate(name);
    };
    self.tab_bar.appendChild(b);
    self.tab_buttons[name] = b;
    self.tabs[name] = document.createElement('div');
    self.tabs[name].className = 'live_tab';
    if(self.tab_class)
      self.tabs[name].className += ' ' + self.tab_class;
    if(Object.keys(self.tabs).length > 1)
      self.tabs[name].style.display = 'none';
    self.container.appendChild(self.tabs[name]);
  }

  this.activate = function (tab_name) {
    for (var key in self.tabs) {
      self.tab_buttons[key].className = 'live_tab_button live_tab_button_us';
      self.tabs[key].style.display = 'none';
    }
    self.tabs[tab_name].style.display = '';
    self.tab_buttons[tab_name].className = 'live_tab_button'; 
  }
}

function livos_button (title, parent, class_name, onclick) {
  this.el = document.createElement('div');
  this.el.className = 'livos_button';
  if(class_name)
    this.el.className += ' ' + class_name;
  this.el.innerHTML = title;
  this.el.onclick = onclick;
  parent.appendChild(this.el);
}