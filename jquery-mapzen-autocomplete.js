import $ from 'jquery';
import throttle from 'lodash.throttle';


class MapzenGeoRequestor {
  constructor(options = {}) {
    this.requestMade = 0;
    this.lastResponseNum = 0;

    this.options = options;
  }

  sendRequest(addressText, onUpdate, onError, onFinished) {
    const thisReqsNumber = (this.requestMade + 1);
    this.requestMade += 1;

    const urlParams = Object.assign({}, this.options, { text: addressText });
    $.ajax({
      url: 'https://search.mapzen.com/v1/autocomplete',
      data: urlParams,
    })
      .done((data) => {
        if (thisReqsNumber > this.lastResponseNum) {
          onUpdate(data);
        }
      })
      .fail(onError)
      .always(() => {
        this.lastResponseNum = thisReqsNumber;

        if (this.lastResponseNum === this.requestMade) {
          onFinished();
        }
      });
  }
}


const reverseGeocode = (mapzenOptions, lat, lng, onSuccess) => {
  const urlParams = Object.assign({}, mapzenOptions, {
    'point.lat': lat,
    'point.lon': lng,
    size: 1,
  });

  $.ajax({
    url: 'https://search.mapzen.com/v1/reverse',
    data: urlParams,
  })
    .done((data) => {
      onSuccess(data);
    })
    .fail(console.error);
};


const getDeviceLocation = (onSuccess) => {
  const geolocateOptions = {
    enableHighAccuracy: true,
  };

  navigator.geolocation.getCurrentPosition((position) => {
    onSuccess(position, Math.round(position.coords.accuracy * 3.28084));
  }, console.error, geolocateOptions);
};


$.fn.extend({
  mapzenAutocomplete: function mapzenAutocomplete({ minCharacters = 5, mapzenOpts = {}, deviceLocation = true } = {}) {  // eslint-disable-line max-len
    this.addClass('autocomplete-input');
    this.attr('autocomplete', 'off');

    // Wrap the <input> in a <div> that we can use to position our attachments (like the spinner)
    this.wrap($('<div class="autocomplete-wrapper"></div>'));
    const $wrapper = this.parent('.autocomplete-wrapper');

    // Add a <ul> that will hold the results of the autocomplete queries and offset it by
    // the height of the <input> so it sits below it
    const $results = $('<ul class="autocomplete-results"></ul>');
    $results.css('top', this.outerHeight());
    this.after($results);

    // Draw a <div> to hold things like the spinner and "Use my location" link; steal
    // font size and line height from the <input> so they'r proportional
    const $attachment = $('<div class="autocomplete-attachment"></div>');
    $wrapper.append($attachment);
    $attachment.css({
      'font-size': this.css('font-size'),
      'line-height': this.css('line-height'),
    });

    // Add a FontAwesome spinner and square it's wrapper element so that it spins correctly
    const $spinner = $('<i class="autocomplete-spinner fa fa-spinner fa-pulse"></i>');
    $attachment.append($spinner);
    $spinner.find('autocomplete-spinner').css({
      width: this.css('line-height'),
      height: this.css('line-height'),
    });

    // Also add a link to kick off device location > reverse geocoding flow, but only if the
    // user's device supports it *and* it hasn't been disabled
    const $locationPrompt = $('<a class="autocomplete-geolocate" href="#"><i class="fa fa-location-arrow"></i> Use my location</a>');
    $attachment.append($locationPrompt);

    if (deviceLocation && 'geolocation' in navigator) {
      // When the user clicks the "Use my location link" ...
      $locationPrompt.on('click', (evt) => {
        evt.preventDefault();

        // ... show the spinner ...
        $wrapper.addClass('autocomplete-searching');

        // ... disable the <input> until geolocation has completed ...
        this.val('').attr('disabled', 'disabled');

        // ... "Use my location" for an in-progress message ...
        $locationPrompt.remove();
        const $geolocating = $('<span class="autocomplete-geolocate">Locating your device</span>');
        $attachment.append($geolocating);

        // ... geolocate with the user's device ...
        getDeviceLocation((position, accuracy) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          // ... then take that geolocation and turn it into an address with Mapzen's API.
          reverseGeocode(mapzenOpts, lat, lng, (results) => {
            this.val(results.features[0].properties.label);
            this.trigger('mapzen:selected', [results.features[0], accuracy]);

            $wrapper.removeClass('autocomplete-searching');

            $geolocating.remove();
            this.attr('disabled', false);
          });
        });
      });
    } else {
      $locationPrompt.remove();
    }

    // Hang on to the latest results, because we'll want to use these later
    let latestResults = [];

    // When someone clicks outside of the autocomplete results, close the drawer
    $(window).on('click', () => {
      $results.html('');
    });

    // When someone clicks on a result in the autcomplete list, use the
    // data-choice attribute to grab it from the latestResults Array and send
    // it via a 'mapzen:selected' event
    $results.on('click', 'li', (evt) => {
      evt.preventDefault();

      $results.html('');

      const choiceNum = $(evt.currentTarget).data('choice');
      const selected = latestResults.features[choiceNum];

      this.val(selected.properties.label);
      this.trigger('mapzen:selected', [selected, null]);
    });

    // Pipe API errors over a 'mapzen:error' event
    const onError = (err) => {
      this.trigger('mapzen:error', err);
    };

    // Callback to handle results as they're returned from the Mapzen search
    // API - basically, wipe out the autocomplete drawer and re-draw it with
    // the API results
    const processResults = (results) => {
      latestResults = results;

      $results.html('');

      results.features.forEach((result, idx) => {
        $results.append(`
          <li class="autocomplete-choice" data-choice="${idx}">
            <i class="fa fa-map-marker"></i> ${result.properties.label}
          </li>`);
      });
    };

    // A boolean to keep track of whether any API query is in progress
    let working = false;

    // When all API queries have finished (not just when any API response
    // has been received), hide the spinner and trigger the finished event
    const onFinished = () => {
      working = false;
      $wrapper.removeClass('autocomplete-searching');
      this.trigger('mapzen:searching-finished');
    };

    // Instantiate a new MapzenGeoRequestor using the API opts passed in earlier,
    // and wiring in the above handlers; throttle the function so we're not
    // sendint too many API calls
    const autoCompleter = new MapzenGeoRequestor(mapzenOpts);
    const processInput = throttle(() => {
      // Only fire the API calls if the user has typed at least the minimum
      // number of characters
      if (this.val().length === 0 || this.val().length < minCharacters) {
        return;
      }

      autoCompleter.sendRequest(this.val(), processResults, onError, onFinished);
    }, 1000, { leading: false });
    this.on('input', processInput);

    // In addition to the debounced handler, also add an unthrottled handler that fires
    // immediately to kick off UI events
    this.on('input', () => {
      if (this.val().length === 0 || this.val().length < minCharacters) {
        $results.html('');
        return;
      }

      $locationPrompt.remove();

      // Any time there's input, start the spinner; we'll remove it once all API
      // queries have finished
      if (!working && this.val().length >= minCharacters) {
        working = true;
        $wrapper.addClass('autocomplete-searching');
        this.trigger('mapzen:searching-started');
      }
    });

    // When the user presses Enter in the <input>, select the first result
    this.on('keydown', (evt) => {
      if (evt.keyCode === 13) {
        evt.preventDefault();
        $results.find('li').first().click();
      }
    });
  },
});
