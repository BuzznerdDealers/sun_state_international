/* Locations map — a standalone document embedded by the homepage's Locations
 * section (site/sections/locations.json) via an <iframe>. Kept isolated on its
 * own page/template (map-embed, no header or footer) exactly as the design
 * handoff's pages/locations-map.html was: a separate document so the map
 * library can be swapped (Mapbox, Google Maps, Leaflet) without touching the
 * host page.
 *
 * The whole interface is two calls (README "Map contract"):
 *   page -> map   frame.contentWindow.setVisibleCities(['Tampa', ...])
 *   map -> page   window.parent.__onLocationPinClick('Tampa, FL')
 *
 * D3 + topojson-client are loaded from a CDN, same as the source handoff —
 * behaviours (carousel/filter/etc.) cannot fetch or drive a third-party map,
 * so per CLAUDE.md §5 this is a case for plain JavaScript.
 */
(function () {
  var LOCATIONS = [
    { city: 'Tampa, FL', lat: 27.9506, lon: -82.4572, phone: '(813) 521-8053', address: 'Tampa, FL' },
    { city: 'Davenport, FL', lat: 28.1611, lon: -81.6011, phone: '(863) 238-2989', address: 'Davenport, FL' },
    { city: 'Sarasota, FL', lat: 27.3364, lon: -82.5307, phone: '(941) 549-2251', address: 'Sarasota, FL' },
    { city: 'Brooksville, FL', lat: 28.5544, lon: -82.3865, phone: '(352) 277-0221', address: 'Brooksville, FL' }
  ];

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.crossOrigin = 'anonymous';
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function init() {
    var svg = d3.select('#ss-map');
    var statesData = null;
    var projection = null;
    var pinElements = {};
    var mapReady = false;
    var pendingVisible = null;

    function render() {
      var node = svg.node();
      var w = node.clientWidth, h = node.clientHeight;
      if (!w || !h || !statesData) return;
      svg.attr('viewBox', '0 0 ' + w + ' ' + h);
      svg.selectAll('*').remove();

      var florida = statesData.features.find(function (f) { return f.id === '12' || f.id === 12; }) || statesData;
      projection = d3.geoAlbersUsa().fitExtent([[w * 0.12, h * 0.1], [w * 0.88, h * 0.9]], florida);
      var path = d3.geoPath(projection);

      svg.append('g').selectAll('path')
        .data(statesData.features)
        .join('path')
        .attr('d', path)
        .attr('fill', 'var(--ink, #141414)')
        .attr('stroke', 'var(--paper, #F4F4F4)')
        .attr('stroke-width', 1);

      var g = svg.append('g');
      pinElements = {};
      var popup = document.getElementById('ss-popup');
      if (popup) popup.hidden = true;

      LOCATIONS.forEach(function (loc) {
        var p = projection([loc.lon, loc.lat]);
        if (!p) return;
        var pin = g.append('g').attr('transform', 'translate(' + p[0] + ',' + p[1] + ')').style('cursor', 'pointer');
        var halo = pin.append('circle').attr('class', 'halo');
        var dot = pin.append('circle').attr('class', 'dot');
        pin.on('click', function () {
          showPopup(loc, p);
          if (window.parent && window.parent !== window && window.parent.__onLocationPinClick) {
            window.parent.__onLocationPinClick(loc.city);
          }
        });
        pinElements[loc.city.split(',')[0]] = { halo: halo, dot: dot };
      });

      mapReady = true;
      window.setVisibleCities(pendingVisible || LOCATIONS.map(function (l) { return l.city.split(',')[0]; }));
    }

    window.setVisibleCities = function (cities) {
      if (!mapReady) { pendingVisible = cities; return; }
      Object.keys(pinElements).forEach(function (city) {
        var el = pinElements[city];
        var matched = cities.indexOf(city) > -1;
        if (matched) {
          el.halo.attr('r', 16).attr('fill', '#fff').attr('opacity', 1);
          el.dot.attr('r', 10).attr('fill', '#EE2D24').attr('stroke', 'none').attr('opacity', 1);
        } else {
          el.halo.attr('r', 0).attr('opacity', 0);
          el.dot.attr('r', 9).attr('fill', 'none').attr('stroke', '#8A8A8A').attr('stroke-width', 2.5).attr('opacity', .55);
        }
      });
      var popup = document.getElementById('ss-popup');
      var cityLabel = document.getElementById('ss-popup-city');
      if (popup && cityLabel && !popup.hidden) {
        var shownCity = cityLabel.textContent.split(',')[0];
        if (cities.indexOf(shownCity) === -1) popup.hidden = true;
      }
    };

    function showPopup(loc, p) {
      var popup = document.getElementById('ss-popup');
      if (!popup) return;
      document.getElementById('ss-popup-city').textContent = loc.city;
      document.getElementById('ss-popup-phone').textContent = loc.phone;
      document.getElementById('ss-popup-directions').href =
        'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(loc.address);
      var left = p[0] + 22, top = p[1] - 10;
      if (left + 230 > window.innerWidth) left = p[0] - 252;
      if (top + 120 > window.innerHeight) top = window.innerHeight - 130;
      popup.style.left = left + 'px';
      popup.style.top = Math.max(10, top) + 'px';
      popup.hidden = false;
    }

    var closeBtn = document.querySelector('.ss-popup__close');
    if (closeBtn) {
      closeBtn.addEventListener('click', function () {
        var popup = document.getElementById('ss-popup');
        if (popup) popup.hidden = true;
      });
    }

    fetch('https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json')
      .then(function (r) { return r.json(); })
      .then(function (us) {
        statesData = topojson.feature(us, us.objects.states);
        render();
      });

    var resizeTimer;
    new ResizeObserver(function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(render, 80);
    }).observe(document.body);
  }

  loadScript('https://unpkg.com/d3@7.9.0/dist/d3.min.js')
    .then(function () { return loadScript('https://unpkg.com/topojson-client@3.1.0/dist/topojson-client.min.js'); })
    .then(init)
    .catch(function (err) { /* eslint-disable-next-line no-console */ console.error('Locations map failed to load', err); });
})();
