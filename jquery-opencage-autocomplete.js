import $ from 'jquery';
import throttle from 'lodash.throttle';


class OrderedGeoRequestor {
  constructor(apiParams) {
    this.requestMade = 0;
    this.lastResponseNum = 0;

    this.apiParams = apiParams;
  }

  sendRequest(addressText, onUpdate, onError, onFinished) {
    const thisReqsNumber = (this.requestMade + 1);
    this.requestMade += 1;

    const data = Object.assign({}, this.apiParams, { q: addressText });

    $.ajax({
      url: 'https://api.opencagedata.com/geocode/v1/json',
      data,
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


const reverseGeocode = (apiParams, lat, lng, onSuccess) => {
  const data = Object.assign({}, apiParams, { q: `${lat}+${lng}` });

  $.ajax({
    url: 'https://api.opencagedata.com/geocode/v1/json',
    data,
  })
    .done((data) => {
      onSuccess(data);
    })
    .fail(console.error);
};


// See https://geocoder.opencagedata.com/api#confidence
const confidence = {
  10: 0.25 * 1000,
  9: 0.5 * 1000,
  8: 1 * 1000,
  7: 5 * 1000,
  6: 7.5 * 1000,
  5: 10 * 1000,
  4: 15 * 1000,
  3: 20 * 1000,
  2: 25 * 1000,
  1: 1 * 1000,
  0: null
};


const getDeviceLocation = (onSuccess) => {
  const geolocateOptions = {
    enableHighAccuracy: true,
  };

  navigator.geolocation.getCurrentPosition((position) => {
    onSuccess(position, position.coords.accuracy);
  }, console.error, geolocateOptions);
};


function opencageAutocomplete({ minCharacters = 5, apiParams = {}, deviceLocation = true, allowedTypes = [] } = {}) {  // eslint-disable-line max-len
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
        reverseGeocode(apiParams, lat, lng, (results) => {
          this.val(results.results[0].formatted);
          this.trigger('autocomplete:selected', [results.results[0], accuracy]);

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
  let latestResults = { results: [] };

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
    const selected = latestResults.results[choiceNum];

    this.val(selected.formatted);

    this.trigger('autocomplete:selected', [selected, confidence[selected.confidence]]);
  });

  // Pipe API errors over a 'mapzen:error' event
  const onError = (err) => {
    this.trigger('autocomplete:error', err);
  };

  // Callback to handle results as they're returned from the Mapzen search
  // API - basically, wipe out the autocomplete drawer and re-draw it with
  // the API results
  const processResults = (results) => {
    if (allowedTypes.length > 0) {
      results.results = results.results.filter(r => allowedTypes.indexOf(r.components._type) !== -1)
    }

    if (results.results.length === 0 && latestResults.results.length === 0) {
      $results.html(`
        <li class="autocomplete-choice autocomplete-too-short">
          Continue typing to search for an address
        </li>`);
      return;
    }

    if (results.results.length === 0) {
      results = latestResults;
    } else {
      latestResults = results;
    }

    $results.html('');

    results.results.forEach((result, idx) => {
      $results.append(`
        <li class="autocomplete-choice" data-choice="${idx}">
          <i class="fa fa-map-marker"></i> ${result.formatted}
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
    this.trigger('autocomplete:searching-finished');
  };

  // Instantiate a new OrderedGeoRequestor using the API opts passed in earlier,
  // and wiring in the above handlers; throttle the function so we're not
  // sendint too many API calls
  const autoCompleter = new OrderedGeoRequestor(apiParams);
  const processInput = throttle(() => {
    // Only fire the API calls if the user has typed at least the minimum
    // number of characters
    if (this.val().length === 0 || this.val().length < minCharacters) {
      // Blow away the cached results if they exist
      latestResults = { results: [] }
      return;
    }

    autoCompleter.sendRequest(this.val(), processResults, onError, onFinished);
  }, 1000, { leading: false });
  this.on('input', processInput);

  // In addition to the debounced handler, also add an unthrottled handler that fires
  // immediately to kick off UI events
  this.on('input', () => {
    if (this.val().length === 0) {
      $results.html('');
    } else if (this.val().length < minCharacters) {
      $results.html(`
        <li class="autocomplete-choice autocomplete-too-short">
          Continue typing to search for an address
        </li>`);
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
}


$.fn.extend({
  opencageAutocomplete,
});


export default (j) => {
  j.fn.extend({
    opencageAutocomplete
  });
};
