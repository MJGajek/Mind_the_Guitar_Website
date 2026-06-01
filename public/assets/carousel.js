/* Mind the Guitar — carousel auto-advance.
 * Same-origin, no external requests. Respects prefers-reduced-motion.
 */
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var START_DELAY = 5000;   // wait before first auto-advance
  var INTERVAL = 4000;      // time between auto-advances
  var PAUSE_AFTER_INPUT = 12000; // pause auto-advance after a manual interaction

  document.querySelectorAll('[data-carousel]').forEach(function (carousel) {
    var track = carousel.querySelector('.carousel__track');
    if (!track) return;

    var timer = null;
    var resumeTimer = null;

    function next() {
      var slides = track.querySelectorAll('.carousel__slide');
      var maxScroll = track.scrollWidth - track.clientWidth;
      if (track.scrollLeft >= maxScroll - 2) {
        track.scrollTo({ left: 0, behavior: 'smooth' });
        return;
      }
      // Align the left edge of the next slide to the left edge of the track.
      var trackLeft = track.getBoundingClientRect().left;
      for (var i = 0; i < slides.length; i++) {
        var delta = slides[i].getBoundingClientRect().left - trackLeft;
        if (delta > 2) {
          track.scrollBy({ left: delta, behavior: 'smooth' });
          return;
        }
      }
      track.scrollTo({ left: maxScroll, behavior: 'smooth' });
    }

    function start() {
      stop();
      timer = setInterval(next, INTERVAL);
    }

    function stop() {
      if (timer) { clearInterval(timer); timer = null; }
    }

    function pauseForInput() {
      stop();
      if (resumeTimer) clearTimeout(resumeTimer);
      resumeTimer = setTimeout(start, PAUSE_AFTER_INPUT);
    }

    ['pointerdown', 'wheel', 'touchstart', 'keydown'].forEach(function (evt) {
      track.addEventListener(evt, pauseForInput, { passive: true });
    });
    carousel.querySelectorAll('.carousel__dots a').forEach(function (dot) {
      dot.addEventListener('click', pauseForInput);
    });

    setTimeout(start, START_DELAY);
  });
})();
