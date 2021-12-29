/*!
 * ol-geocoder - v4.1.2
 * A geocoder extension for OpenLayers.
 * https://github.com/jonataswalker/ol-geocoder
 * Built: Wed Dec 29 2021 18:15:07 GMT+0100 (Central European Standard Time)
 */

import Control from 'ol/control/Control';
import Style from 'ol/style/Style';
import Icon from 'ol/style/Icon';
import LayerVector from 'ol/layer/Vector';
import SourceVector from 'ol/source/Vector';
import Point from 'ol/geom/Point';
import Feature from 'ol/Feature';
import proj from 'ol/proj';

var containerId = "gcd-container";
var buttonControlId = "gcd-button-control";
var inputQueryId = "gcd-input-query";
var inputResetId = "gcd-input-reset";
var cssClasses = {
	namespace: "ol-geocoder",
	spin: "gcd-pseudo-rotate",
	hidden: "gcd-hidden",
	address: "gcd-address",
	country: "gcd-country",
	city: "gcd-city",
	road: "gcd-road",
	olControl: "ol-control",
	glass: {
		container: "gcd-gl-container",
		control: "gcd-gl-control",
		button: "gcd-gl-btn",
		input: "gcd-gl-input",
		expanded: "gcd-gl-expanded",
		reset: "gcd-gl-reset",
		result: "gcd-gl-result"
	},
	inputText: {
		container: "gcd-txt-container",
		control: "gcd-txt-control",
		input: "gcd-txt-input",
		reset: "gcd-txt-reset",
		icon: "gcd-txt-glass",
		result: "gcd-txt-result"
	}
};
var vars = {
	containerId: containerId,
	buttonControlId: buttonControlId,
	inputQueryId: inputQueryId,
	inputResetId: inputResetId,
	cssClasses: cssClasses
};

var _VARS_ = /*#__PURE__*/Object.freeze({
  __proto__: null,
  containerId: containerId,
  buttonControlId: buttonControlId,
  inputQueryId: inputQueryId,
  inputResetId: inputResetId,
  cssClasses: cssClasses,
  'default': vars
});

const VARS = _VARS_;

const EVENT_TYPE = {
  ADDRESSCHOSEN: 'addresschosen',
};

const CONTROL_TYPE = {
  NOMINATIM: 'nominatim',
  REVERSE: 'reverse',
};

const TARGET_TYPE = {
  GLASS: 'glass-button',
  INPUT: 'text-input',
};

const FEATURE_SRC = '//cdn.rawgit.com/jonataswalker/map-utils/master/images/marker.png';

const PROVIDERS = {
  OSM: 'osm',
  MAPQUEST: 'mapquest',
  PHOTON: 'photon',
  BING: 'bing',
  OPENCAGE: 'opencage',
};

const DEFAULT_OPTIONS = {
  provider: PROVIDERS.OSM,
  placeholder: 'Search for an address',
  featureStyle: null,
  targetType: TARGET_TYPE.GLASS,
  lang: 'en-US',
  limit: 5,
  keepOpen: false,
  preventDefault: false,
  autoComplete: false,
  autoCompleteMinLength: 2,
  autoCompleteTimeout: 200,
  debug: false,
};

/**
 * Overwrites obj1's values with obj2's and adds
 * obj2's if non existent in obj1
 * @returns obj3 a new object based on obj1 and obj2
 */
function mergeOptions(obj1, obj2) {
  const obj3 = {};

  for (const key in obj1) {
    if (Object.prototype.hasOwnProperty.call(obj1, key)) {
      obj3[key] = obj1[key];
    }
  }

  for (const key in obj2) {
    if (Object.prototype.hasOwnProperty.call(obj2, key)) {
      obj3[key] = obj2[key];
    }
  }

  return obj3;
}

function assert(condition, message = 'Assertion failed') {
  if (!condition) {
    if (typeof Error !== 'undefined') throw new Error(message);

    throw message; // Fallback
  }
}

function now() {
  // Polyfill for window.performance.now()
  // @license http://opensource.org/licenses/MIT
  // copyright Paul Irish 2015
  // https://gist.github.com/paulirish/5438650
  if ('performance' in window === false) {
    window.performance = {};
  }

  if ('now' in window.performance === false) {
    let nowOffset = Date.now();

    if (performance.timing && performance.timing.navigationStart) {
      nowOffset = performance.timing.navigationStart;
    }

    window.performance.now = () => Date.now() - nowOffset;
  }

  return window.performance.now();
}

function flyTo(map, coord, duration = 500, resolution = 2.388657133911758) {
  map.getView().animate({ duration, resolution }, { duration, center: coord });
}

function randomId(prefix) {
  const id = now().toString(36);

  return prefix ? prefix + id : id;
}

function isNumeric(str) {
  return /^\d+$/u.test(str);
}

/* eslint-disable optimize-regex/optimize-regex */

/**
 * @param {Element|Array<Element>} element DOM node or array of nodes.
 * @param {String|Array<String>} classname Class or array of classes.
 * For example: 'class1 class2' or ['class1', 'class2']
 * @param {Number|undefined} timeout Timeout to remove a class.
 */
function addClass(element, classname, timeout) {
  if (Array.isArray(element)) {
    element.forEach((each) => addClass(each, classname));

    return;
  }

  const array = Array.isArray(classname) ? classname : classname.split(/\s+/u);

  let i = array.length;

  while (i--) {
    if (!hasClass(element, array[i])) {
      _addClass(element, array[i], timeout);
    }
  }
}

/**
 * @param {Element|Array<Element>} element DOM node or array of nodes.
 * @param {String|Array<String>} classname Class or array of classes.
 * For example: 'class1 class2' or ['class1', 'class2']
 * @param {Number|undefined} timeout Timeout to add a class.
 */
function removeClass(element, classname, timeout) {
  if (Array.isArray(element)) {
    element.forEach((each) => removeClass(each, classname, timeout));

    return;
  }

  const array = Array.isArray(classname) ? classname : classname.split(/\s+/u);

  let i = array.length;

  while (i--) {
    if (hasClass(element, array[i])) {
      _removeClass(element, array[i], timeout);
    }
  }
}

/**
 * @param {Element} element DOM node.
 * @param {String} classname Classname.
 * @return {Boolean}
 */
function hasClass(element, c) {
  // use native if available
  return element.classList ? element.classList.contains(c) : classRegex(c).test(element.className);
}

function removeAllChildren(node) {
  while (node.firstChild) node.firstChild.remove();
}

function template(html, row) {
  return html.replace(/\{\s*([\w-]+)\s*\}/gu, (htm, key) => {
    const value = row[key] === undefined ? '' : row[key];

    return htmlEscape(value);
  });
}

function htmlEscape(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function createElement(node, html) {
  let elem;

  if (Array.isArray(node)) {
    elem = document.createElement(node[0]);

    if (node[1].id) elem.id = node[1].id;

    if (node[1].classname) elem.className = node[1].classname;

    if (node[1].attr) {
      const { attr } = node[1];

      if (Array.isArray(attr)) {
        let i = -1;

        while (++i < attr.length) {
          elem.setAttribute(attr[i].name, attr[i].value);
        }
      } else {
        elem.setAttribute(attr.name, attr.value);
      }
    }
  } else {
    elem = document.createElement(node);
  }

  elem.innerHTML = html;

  const frag = document.createDocumentFragment();

  while (elem.childNodes[0]) frag.append(elem.childNodes[0]);

  elem.append(frag);

  return elem;
}

function classRegex(classname) {
  // eslint-disable-next-line security/detect-non-literal-regexp
  return new RegExp(`(^|\\s+) ${classname} (\\s+|$)`, 'u');
}

function _addClass(el, klass, timeout) {
  // use native if available
  if (el.classList) {
    el.classList.add(klass);
  } else {
    el.className = `${el.className} ${klass}`.trim();
  }

  if (timeout && isNumeric(timeout)) {
    window.setTimeout(() => _removeClass(el, klass), timeout);
  }
}

function _removeClass(el, klass, timeout) {
  if (el.classList) {
    el.classList.remove(klass);
  } else {
    el.className = el.className.replace(classRegex(klass), ' ').trim();
  }

  if (timeout && isNumeric(timeout)) {
    window.setTimeout(() => _addClass(el, klass), timeout);
  }
}

const klasses = VARS.cssClasses;

/**
 * @class Html
 */
class Html {
  /**
   * @constructor
   * @param {Function} base Base class.
   */
  constructor(base) {
    this.options = base.options;
    this.els = this.createControl();
  }

  createControl() {
    let container;
    let containerClass;
    let elements;

    if (this.options.targetType === TARGET_TYPE.INPUT) {
      containerClass = `${klasses.namespace} ${klasses.inputText.container}`;
      container = createElement(
        ['div', { id: VARS.containerId, classname: containerClass }],
        Html.input
      );
      elements = {
        container,
        control: container.querySelector(`.${klasses.inputText.control}`),
        input: container.querySelector(`.${klasses.inputText.input}`),
        reset: container.querySelector(`.${klasses.inputText.reset}`),
        result: container.querySelector(`.${klasses.inputText.result}`),
      };
    } else {
      containerClass = `${klasses.namespace} ${klasses.glass.container}`;
      container = createElement(
        ['div', { id: VARS.containerId, classname: containerClass }],
        Html.glass
      );
      elements = {
        container,
        control: container.querySelector(`.${klasses.glass.control}`),
        button: container.querySelector(`.${klasses.glass.button}`),
        input: container.querySelector(`.${klasses.glass.input}`),
        reset: container.querySelector(`.${klasses.glass.reset}`),
        result: container.querySelector(`.${klasses.glass.result}`),
      };
    }

    // set placeholder from options
    elements.input.placeholder = this.options.placeholder;

    return elements;
  }
}

Html.glass = `
  <div class="${klasses.glass.control} ${klasses.olControl}">
    <button type="button" id="${VARS.buttonControlId}" class="${klasses.glass.button}"></button>
    <input type="text" id="${VARS.inputQueryId}" class="${klasses.glass.input}" autocomplete="off" placeholder="Search ...">
    <a id="${VARS.inputResetId}" class="${klasses.glass.reset} ${klasses.hidden}"></a>
  </div>
  <ul class="${klasses.glass.result}"></ul>
`;

Html.input = `
  <div class="${klasses.inputText.control}">
    <input type="text" id="${VARS.inputQueryId}" class="${klasses.inputText.input}" autocomplete="off" placeholder="Search ...">
    <span class="${klasses.inputText.icon}"></span>
    <button type="button" id="${VARS.inputResetId}" class="${klasses.inputText.reset} ${klasses.hidden}"></button>
  </div>
  <ul class="${klasses.inputText.result}"></ul>
`;

/**
 * @class Photon
 */
class Photon {
  /**
   * @constructor
   */
  constructor() {
    this.settings = {
      url: 'https://photon.komoot.io/api/',

      params: {
        q: '',
        limit: 10,
        lang: 'en',
      },

      langs: ['de', 'it', 'fr', 'en'],
    };
  }

  getParameters(options) {
    options.lang = options.lang.toLowerCase();

    return {
      url: this.settings.url,

      params: {
        q: options.query,
        limit: options.limit || this.settings.params.limit,

        lang: this.settings.langs.includes(options.lang) ? options.lang : this.settings.params.lang,
      },
    };
  }

  handleResponse(results) {
    if (results.features.length === 0) return [];

    return results.features.map((result) => ({
      lon: result.geometry.coordinates[0],
      lat: result.geometry.coordinates[1],

      address: {
        name: result.properties.name,
        postcode: result.properties.postcode,
        city: result.properties.city,
        state: result.properties.state,
        country: result.properties.country,
      },

      original: {
        formatted: result.properties.name,
        details: result.properties,
      },
    }));
  }
}

/**
 * @class OpenStreet
 */
class OpenStreet {
  /**
   * @constructor
   */
  constructor() {
    this.settings = {
      url: 'https://nominatim.openstreetmap.org/search/',

      params: {
        q: '',
        format: 'json',
        addressdetails: 1,
        limit: 10,
        countrycodes: '',
        'accept-language': 'en-US',
      },
    };
  }

  getParameters(opt) {
    return {
      url: this.settings.url,

      params: {
        q: opt.query,
        format: this.settings.params.format,
        addressdetails: this.settings.params.addressdetails,
        limit: opt.limit || this.settings.params.limit,
        countrycodes: opt.countrycodes || this.settings.params.countrycodes,
        'accept-language': opt.lang || this.settings.params['accept-language'],
      },
    };
  }

  handleResponse(results) {
    if (results.length === 0) return [];

    return results.map((result) => ({
      lon: result.lon,
      lat: result.lat,
      bbox: result.boundingbox,

      address: {
        name: result.display_name,
        road: result.address.road || '',
        houseNumber: result.address.house_number || '',
        postcode: result.address.postcode,
        city: result.address.city || result.address.town,
        state: result.address.state,
        country: result.address.country,
      },

      original: {
        formatted: result.display_name,
        details: result.address,
      },
    }));
  }
}

/**
 * @class MapQuest
 */
class MapQuest {
  /**
   * @constructor
   */
  constructor() {
    this.settings = {
      url: 'https://open.mapquestapi.com/nominatim/v1/search.php',

      params: {
        q: '',
        key: '',
        format: 'json',
        addressdetails: 1,
        limit: 10,
        countrycodes: '',
        'accept-language': 'en-US',
      },
    };
  }

  getParameters(options) {
    return {
      url: this.settings.url,

      params: {
        q: options.query,
        key: options.key,
        format: 'json',
        addressdetails: 1,
        limit: options.limit || this.settings.params.limit,
        countrycodes: options.countrycodes || this.settings.params.countrycodes,

        'accept-language': options.lang || this.settings.params['accept-language'],
      },
    };
  }

  handleResponse(results) {
    if (results.length === 0) return [];

    return results.map((result) => ({
      lon: result.lon,
      lat: result.lat,

      address: {
        name: result.address.neighbourhood || '',
        road: result.address.road || '',
        postcode: result.address.postcode,
        city: result.address.city || result.address.town,
        state: result.address.state,
        country: result.address.country,
      },

      original: {
        formatted: result.display_name,
        details: result.address,
      },
    }));
  }
}

/**
 * @class Bing
 */
class Bing {
  /**
   * @constructor
   */
  constructor() {
    this.settings = {
      url: 'https://dev.virtualearth.net/REST/v1/Locations',
      callbackName: 'jsonp',

      params: {
        query: '',
        key: '',
        includeNeighborhood: 0,
        maxResults: 10,
      },
    };
  }

  getParameters(options) {
    return {
      url: this.settings.url,
      callbackName: this.settings.callbackName,

      params: {
        query: options.query,
        key: options.key,

        includeNeighborhood:
          options.includeNeighborhood || this.settings.params.includeNeighborhood,

        maxResults: options.maxResults || this.settings.params.maxResults,
      },
    };
  }

  handleResponse(results) {
    const { resources } = results.resourceSets[0];

    if (resources.length === 0) return [];

    return resources.map((result) => ({
      lon: result.point.coordinates[1],
      lat: result.point.coordinates[0],

      address: {
        name: result.name,
      },

      original: {
        formatted: result.address.formattedAddress,
        details: result.address,
      },
    }));
  }
}

/**
 * @class OpenCage
 */
class OpenCage {
  /**
   * @constructor
   */
  constructor() {
    this.settings = {
      url: 'https://api.opencagedata.com/geocode/v1/json?',

      params: {
        q: '',
        key: '',
        limit: 10,
        countrycode: '',
        pretty: 1,
        no_annotations: 1,
      },
    };
  }

  getParameters(options) {
    return {
      url: this.settings.url,

      params: {
        q: options.query,
        key: options.key,
        limit: options.limit || this.settings.params.limit,
        countrycode: options.countrycodes || this.settings.params.countrycodes,
      },
    };
  }

  handleResponse(results) {
    if (results.results.length === 0) return [];

    return results.results.map((result) => ({
      lon: result.geometry.lng,
      lat: result.geometry.lat,

      address: {
        name: result.components.house_number || '',
        road: result.components.road || '',
        postcode: result.components.postcode,
        city: result.components.city || result.components.town,
        state: result.components.state,
        country: result.components.country,
      },

      original: {
        formatted: result.formatted,
        details: result.components,
      },
    }));
  }
}

function json(obj) {
  return new Promise((resolve, reject) => {
    const url = encodeUrlXhr(obj.url, obj.data);
    const config = {
      method: 'GET',
      mode: 'cors',
      credentials: 'same-origin',
    };

    if (obj.jsonp) {
      jsonp(url, obj.callbackName, resolve);
    } else {
      fetch(url, config)
        .then((r) => r.json())
        .then(resolve)
        .catch(reject);
    }
  });
}

function toQueryString(obj) {
  return Object.keys(obj)
    .reduce((acc, k) => {
      acc.push(
        typeof obj[k] === 'object'
          ? toQueryString(obj[k])
          : `${encodeURIComponent(k)}=${encodeURIComponent(obj[k])}`
      );

      return acc;
    }, [])
    .join('&');
}

function encodeUrlXhr(url, data) {
  if (data && typeof data === 'object') {
    url += (/\?/u.test(url) ? '&' : '?') + toQueryString(data);
  }

  return url;
}

function jsonp(url, key, callback) {
  // https://github.com/Fresheyeball/micro-jsonp/blob/master/src/jsonp.js
  const { head } = document;
  const script = document.createElement('script');
  // generate minimally unique name for callback function
  const callbackName = `f${Math.round(Math.random() * Date.now())}`;

  // set request url
  script.setAttribute(
    'src',
    // add callback parameter to the url
    //    where key is the parameter key supplied
    //    and callbackName is the parameter value
    `${url + (url.indexOf('?') > 0 ? '&' : '?') + key}=${callbackName}`
  );

  // place jsonp callback on window,
  //  the script sent by the server should call this
  //  function as it was passed as a url parameter
  window[callbackName] = (data) => {
    window[callbackName] = undefined;

    // clean up script tag created for request
    setTimeout(() => head.removeChild(script), 0);

    // hand data back to the user
    callback(data);
  };

  // actually make the request
  head.append(script);
}

const klasses$1 = VARS.cssClasses;

/**
 * @class Nominatim
 */
class Nominatim {
  /**
   * @constructor
   * @param {Function} base Base class.
   */
  constructor(base, els) {
    this.Base = base;

    this.layerName = randomId('geocoder-layer-');
    this.layer = new LayerVector({
      name: this.layerName,
      source: new SourceVector(),
    });

    this.options = base.options;
    // provider is either the name of a built-in provider as a string or an
    // object that implements the provider API
    this.options.provider =
      typeof this.options.provider === 'string'
        ? this.options.provider.toLowerCase()
        : this.options.provider;
    this.provider = this.newProvider();

    this.els = els;
    this.lastQuery = '';
    this.container = this.els.container;
    this.registeredListeners = { mapClick: false };
    this.setListeners();
  }

  setListeners() {
    let timeout;
    let lastQuery;

    const openSearch = (evt) => {
      evt.stopPropagation();

      hasClass(this.els.control, klasses$1.glass.expanded) ? this.collapse() : this.expand();
    };
    const query = (evt) => {
      const value = evt.target.value.trim();
      const hit = evt.key
        ? evt.key === 'Enter'
        : evt.which
        ? evt.which === 13
        : evt.keyCode
        ? evt.keyCode === 13
        : false;

      if (hit) {
        evt.preventDefault();
        this.query(value);
      }
    };
    // eslint-disable-next-line unicorn/consistent-function-scoping
    const stopBubbling = (evt) => evt.stopPropagation();
    const reset = (evt) => {
      this.els.input.focus();
      this.els.input.value = '';
      this.lastQuery = '';
      addClass(this.els.reset, klasses$1.hidden);
      this.clearResults();
    };
    const handleValue = (evt) => {
      const value = evt.target.value.trim();

      value.length !== 0
        ? removeClass(this.els.reset, klasses$1.hidden)
        : addClass(this.els.reset, klasses$1.hidden);

      if (this.options.autoComplete && value !== lastQuery) {
        lastQuery = value;
        timeout && clearTimeout(timeout);
        timeout = setTimeout(() => {
          if (value.length >= this.options.autoCompleteMinLength) {
            this.query(value);
          }
        }, this.options.autoCompleteTimeout);
      }
    };

    this.els.input.addEventListener('keypress', query, false);
    this.els.input.addEventListener('click', stopBubbling, false);
    this.els.input.addEventListener('input', handleValue, false);
    this.els.reset.addEventListener('click', reset, false);

    if (this.options.targetType === TARGET_TYPE.GLASS) {
      this.els.button.addEventListener('click', openSearch, false);
    }
  }

  query(q) {
    // lazy provider
    if (!this.provider) {
      this.provider = this.newProvider();
    }

    const parameters = this.provider.getParameters({
      query: q,
      key: this.options.key,
      lang: this.options.lang,
      countrycodes: this.options.countrycodes,
      limit: this.options.limit,
    });

    if (this.lastQuery === q && this.els.result.firstChild) return;

    this.lastQuery = q;
    this.clearResults();
    addClass(this.els.reset, klasses$1.spin);

    const ajax = {
      url: parameters.url,
      data: parameters.params,
    };

    if (parameters.callbackName) {
      ajax.jsonp = true;
      ajax.callbackName = parameters.callbackName;
    }

    json(ajax)
      .then((res) => {
        // eslint-disable-next-line no-console
        this.options.debug && console.info(res);

        removeClass(this.els.reset, klasses$1.spin);

        // will be fullfiled according to provider
        const res_ = this.provider.handleResponse(res);

        if (res_) {
          this.createList(res_);
          this.listenMapClick();
        }
      })
      .catch((err) => {
        removeClass(this.els.reset, klasses$1.spin);

        const li = createElement('li', '<h5>Error! No internet connection?</h5>');

        this.els.result.append(li);
      });
  }

  createList(response) {
    const ul = this.els.result;
      bbox = proj.transformExtent(
        [bbox[2], bbox[1], bbox[3], bbox[0]], // NSWE -> WSEN
        'EPSG:4326',
        projection
      );
    

    const address = {
      formatted: addressHtml,
      details: addressObj,
      original: addressOriginal,
    };

    this.options.keepOpen === false && this.clearResults(true);

    if (this.options.preventDefault === true) {
      this.Base.dispatchEvent({
        type: EVENT_TYPE.ADDRESSCHOSEN,
        address,
        coordinate: coord,
        bbox,
        place,
      });
    } else {
      if (bbox) {
        map.getView().fit(bbox, { duration: 500 });
      } else {
        flyTo(map, coord);
      }

      const feature = this.createFeature(coord, address);

      this.Base.dispatchEvent({
        type: EVENT_TYPE.ADDRESSCHOSEN,
        address,
        feature,
        coordinate: coord,
        bbox,
        place,
      });
    }
  }

  createFeature(coord) {
    const feature = new Feature(new Point(coord));

    this.addLayer();
    feature.setStyle(this.options.featureStyle);
    feature.setId(randomId('geocoder-ft-'));
    this.getSource().addFeature(feature);

    return feature;
  }

  addressTemplate(address) {
    const html = [];

    if (address.name) {
      html.push(['<span class="', klasses$1.road, '">{name}</span>'].join(''));
    }

    if (address.road || address.building || address.house_number) {
      html.push(
        ['<span class="', klasses$1.road, '">{building} {road} {house_number}</span>'].join('')
      );
    }

    if (address.city || address.town || address.village) {
      html.push(
        ['<span class="', klasses$1.city, '">{postcode} {city} {town} {village}</span>'].join('')
      );
    }

    if (address.state || address.country) {
      html.push(['<span class="', klasses$1.country, '">{state} {country}</span>'].join(''));
    }

    return template(html.join('<br>'), address);
  }

  newProvider() {
    switch (this.options.provider) {
      case PROVIDERS.OSM:
        return new OpenStreet();
      case PROVIDERS.MAPQUEST:
        return new MapQuest();
      case PROVIDERS.PHOTON:
        return new Photon();
      case PROVIDERS.BING:
        return new Bing();
      case PROVIDERS.OPENCAGE:
        return new OpenCage();

      default:
        return this.options.provider;
    }
  }

  expand() {
    removeClass(this.els.input, klasses$1.spin);
    addClass(this.els.control, klasses$1.glass.expanded);
    window.setTimeout(() => this.els.input.focus(), 100);
    this.listenMapClick();
  }

  collapse() {
    this.els.input.value = '';
    this.els.input.blur();
    addClass(this.els.reset, klasses$1.hidden);
    removeClass(this.els.control, klasses$1.glass.expanded);
    this.clearResults();
  }

  listenMapClick() {
    // already registered
    if (this.registeredListeners.mapClick) return;

    const that = this;
    const mapElement = this.Base.getMap().getTargetElement();

    this.registeredListeners.mapClick = true;

    // one-time fire click
    mapElement.addEventListener(
      'click',
      {
        handleEvent(evt) {
          that.clearResults(true);
          mapElement.removeEventListener(evt.type, this, false);
          that.registeredListeners.mapClick = false;
        },
      },
      false
    );
  }

  clearResults(collapse) {
    collapse && this.options.targetType === TARGET_TYPE.GLASS
      ? this.collapse()
      : removeAllChildren(this.els.result);
  }

  getSource() {
    return this.layer.getSource();
  }

  addLayer() {
    let found = false;

    const map = this.Base.getMap();

    map.getLayers().forEach((layer) => {
      if (layer === this.layer) found = true;
    });

    if (!found) map.addLayer(this.layer);
  }
}

/**
 * @class Base
 * @extends {ol.control.Control}
 */
class Base extends Control {
  /**
   * @constructor
   * @param {string} type nominatim|reverse.
   * @param {object} options Options.
   */
  constructor(type = CONTROL_TYPE.NOMINATIM, options = {}) {
    if (!(this instanceof Base)) return new Base();

    assert(typeof type === 'string', '@param `type` should be string!');
    assert(
      type === CONTROL_TYPE.NOMINATIM || type === CONTROL_TYPE.REVERSE,
      `@param 'type' should be '${CONTROL_TYPE.NOMINATIM}'
      or '${CONTROL_TYPE.REVERSE}'!`
    );
    assert(typeof options === 'object', '@param `options` should be object!');

    DEFAULT_OPTIONS.featureStyle = [
      new Style({ image: new Icon({ scale: 0.7, src: FEATURE_SRC }) }),
    ];

    this.options = mergeOptions(DEFAULT_OPTIONS, options);
    this.container = undefined;

    let $nominatim;

    const $html = new Html(this);

    if (type === CONTROL_TYPE.NOMINATIM) {
      this.container = $html.els.container;
      $nominatim = new Nominatim(this, $html.els);
      this.layer = $nominatim.layer;
    }

    super({ element: this.container });
  }

  /**
   * @return {ol.layer.Vector} Returns the layer created by this control
   */
  getLayer() {
    return this.layer;
  }

  /**
   * @return {ol.source.Vector} Returns the source created by this control
   */
  getSource() {
    return this.getLayer().getSource();
  }

  /**
   * Set a new provider
   * @param {String} provider
   */
  setProvider(provider) {
    this.options.provider = provider;
  }

  /**
   * Set provider key
   * @param {String} key
   */
  setProviderKey(key) {
    this.options.key = key;
  }
}

export default Base;
