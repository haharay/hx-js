// This is designed to be called by hx.js
// It uses the Summernote editor.

var HXEditor = function(use_backpack, toolbar_options) {
  var editors = $('.hx-editor');
  // Clearing out the editor text.
  // Could save this as default starting text instead?
  editors.empty();

  logThatThing('HX Editor starting');

  // Read the save slot from the data-saveslot attribute.
  var editor_save_slots = Object.keys($('div')).map(function(k, i) {
    try {
      return $('div')[k].attributes['data-saveslot'];
    } catch (err) {
      return '';
    }
  });

  // Insert a loading indicator.
  let edit_box = $('<div> Loading...</div>');
  let spinner = $('<span class="fa fa-spinner fa-pulse"></span>');
  edit_box.prepend(spinner);
  editors.append(edit_box);

  // Wait for summernote to load.
  // It's in an external javascript file loaded by hx-js.
  var timer_count = 0;
  var time_delay = 250; // miliseconds
  var loadLoop = setInterval(function() {
    timer_count += time_delay;

    // If it doesn't load after 7 seconds,
    // kill the indicator and inform the learner.
    if (timer_count > 7000) {
      edit_box.empty();
      edit_box.append(
        '<p>Editor did not load. Reload the page if you want to try again.</p>'
      );
      clearInterval(loadLoop);
    }

    if (typeof $.summernote !== 'undefined') {
      // If it loads...
      clearInterval(loadLoop);
      activateAllEditors();
    }
  }, time_delay);

  // Set up loop to auto-save once/minute
  let autoSave = setInterval(function() {
    var to_save = {};
    var has_changed = false;
    editors.each(function(i, e) {
      // Don't save things that haven't changed.
      // Using underscore.js to check object equality.
      let markup_string = $(e)
        .find('.summernote')
        .summernote('code');
      if (
        !_.isEqual(hxGetData('summernote_' + getSaveSlot($(e))), markup_string)
      ) {
        to_save['summernote_' + getSaveSlot($(e))] = markup_string;
        has_changed = true;
      }
    });
    if (has_changed) {
      hxSetData(to_save);
      console.log('auto-saved');
      // Disable save/load buttons until the backpack reloads.
      $('.autosavenotice').text(' Auto-saving...');
      $('.loadnote').attr('disabled', true);
      $('.savenote').attr('disabled', true);
    } else {
      console.log('no changes, no need to auto-save');
    }
  }, 60000);

  // Turns on one particular editor.
  function activateEditor(saveslot) {
    console.log('activating ' + saveslot + ' editor');
    // Get the editor we're interested in.
    let ed = $('.hx-editor').find('[data-saveslot="' + saveslot + '"]');
    // Remove the loading indicator.
    ed.empty();
    // Insert the div for summernote to hook onto.
    let summer = $('<div class="summernote"></div>');
    ed.append(summer);
    // Activate summernote.
    summer.summernote({
      toolbar: toolbar_options
    });
    addControls(ed);
  }

  // Turns on ALL the editors.
  function activateAllEditors() {
    console.log('activating all editors');
    // Get the editor we're interested in.
    let eds = $('.hx-editor');
    // Remove the loading indicator.
    eds.empty();
    // Insert the div for summernote to hook onto.
    let summer = $('<div class="summernote"></div>');
    eds.append(summer);
    // Activate summernote.
    summer.summernote({
      toolbar: toolbar_options
    });
    addControls(eds);
  }

  function addControls(editors) {
    // Replace blank editors with the saved data.
    editors.each(function(i, e) {
      let ed = $(e).find('.summernote');
      if ($(ed.summernote('code')).text() == '') {
        ed.summernote('code', hxGetData('summernote_' + getSaveSlot($(e))));
      }
    });

    // If we're not using the backpack, show a warning notice.
    if (!use_backpack) {
      let noSaveWarning = $('<div/>');
      noSaveWarning.css({
        'background-color': 'orange',
        border: '2px solid black'
      });
      noSaveWarning.append(
        'Warning: Data storage unavailable. This editor cannot save or load files. Reload the page if you want to try again.'
      );
      editors.prepend(noSaveWarning);
    }

    // Add save/load buttons.
    let save_button = $('<button>Save</button>');
    save_button.addClass('savenote');

    let load_button = $('<button>Load</button>');
    load_button.addClass('loadnote');

    let save_notice = $('<span/>');
    save_notice.addClass('autosavenotice');
    save_notice.css('color', 'darkgray');

    editors.prepend(save_notice);
    editors.prepend(save_button);
    editors.prepend(load_button);

    // Save and load disabled until the backpack loads.
    // It could be already loaded, so don't disable unnecessicarily.
    if (typeof hxBackpackLoaded === 'undefined') {
      save_button.attr('disabled', true);
      load_button.attr('disabled', true);
      save_notice.text(' Loading...');
    }

    // Add listeners for save/load buttons.
    $('.savenote').on('click tap', function() {
      let markup_string = $(this)
        .parent()
        .find('.summernote')
        .summernote('code');

      // Note the editor's saveslot.
      hxSetData('summernote_' + getSaveSlot($(this)), markup_string);
      console.log(markup_string);

      // Disable save/load buttons.
      // These will re-enable after the backpack loads.
      $('.autosavenotice').text(' Saving...');
      $('.loadnote').attr('disabled', true);
      $('.savenote').attr('disabled', true);
    });
    $('.loadnote').on('click tap', function() {
      $('.hx-editor .summernote').summernote(
        'code',
        hxGetData('summernote_' + getSaveSlot($(this)))
      );
    });
  }

  // The save slot is the value in data-saveslot attribute, or '' if blank.
  // Pass in a JQuery object that's inside the editor's parent,
  // such as the save or load buttons.
  function getSaveSlot(t) {
    try {
      if (typeof t.attr('data-saveslot') === 'undefined') {
        return '';
      } else {
        return t.attr('data-saveslot');
      }
    } catch (err) {
      return '';
    }
  }

  // The backpack is our data storage system on edX.
  // It posts a message when it loads.
  // See https://github.com/Stanford-Online/js-input-samples/tree/master/learner_backpack
  function hearBackpackLoad(e) {
    // Only accept from edx sites.
    if (
      e.origin !== 'https://courses.edx.org' &&
      e.origin !== 'https://preview.edx.org' &&
      e.origin !== 'https://edge.edx.org'
    ) {
      return;
    }

    // Only accept objects with the right form.
    if (typeof e.data === 'string') {
      if (e.data === 'ready') {
        console.log('Backpack ready.');
        $('.loadnote').removeAttr('disabled');
        $('.savenote').removeAttr('disabled');
        $('.autosavenotice').empty();
        // Replace blank editors with the saved data.
        $('.hx-editor').each(function(i, e) {
          let ed = $(e).find('.summernote');
          if ($(ed.summernote('code')).text() == '') {
            ed.summernote('code', hxGetData('summernote_' + getSaveSlot($(e))));
          }
        });
      }
    }
  }
  addEventListener('message', hearBackpackLoad, false);

  // Publishing functions for general use.
  this.getSaveSlot = getSaveSlot;
  this.activateEditor = activateEditor;
  this.activateAllEditors = activateAllEditors;
};
