// Creates spacer to maintain scrollY when removing or hiding elements
function addToSpacer(amountToAdd, storedDocHeight = null, storedScrollY = null, storedWindowHeight = null) {
    const spacer = document.getElementById("spacer");
    const docHeight = (storedDocHeight) ? storedDocHeight: document.documentElement.scrollHeight;
    const scrollY = (storedScrollY) ? storedScrollY : window.scrollY;
    const windowHeight = (storedWindowHeight) ? storedWindowHeight : window.innerHeight;

    const nearBottom = scrollY + windowHeight >= docHeight - amountToAdd - 1; //prevents subpixels
    const hasScrollbar = docHeight > windowHeight;
    if (nearBottom && hasScrollbar) {
        if (spacer.offsetHeight === 0) window.addEventListener("scroll", checkSpacer, {passive:true});
        spacer.style.height = (parseInt(spacer.style.height || '0') + amountToAdd) + "px";
        window.scrollTo(0, scrollY);
        checkSpacer();
    }
}

// Remove from spacer when adding or showing elements
function removeFromSpacer(amountToRemove) {
    const spacer = document.getElementById("spacer");
    if(parseInt(spacer.style.height)) {
        spacer.style.height = Math.max(0, (parseInt(spacer.style.height || '0') - amountToRemove)) + "px";
        checkSpacer();
    }
}

// Listens for scroll and reduce spacer height; remove listener if height is zero
function checkSpacer() {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
        const spacer = document.getElementById("spacer");
        if (!spacer) return;

        const spacerTop = spacer.offsetTop; //Body is parent so this measures from top of page
        const pageBottom = window.scrollY + window.innerHeight;
        spacer.style.height = Math.max(0, pageBottom - spacerTop) + "px";
        
        const fullScreen = document.documentElement.scrollHeight <= window.innerHeight + 1;
        if (fullScreen || spacer.offsetHeight <= 1) {
            spacer.style.height = "0px";
            window.removeEventListener("scroll", checkSpacer);
        }
    }, 25);
}

// Scrolling to top of specific div
function smoothScroll(targetId, duration = 1250) {
    const targetElement = document.getElementById(targetId);
    if (!targetElement) return;
  
    const startPosition = window.scrollY;
    const targetPosition = targetElement.getBoundingClientRect().top + startPosition;
    const distance = targetPosition - startPosition;
    let startTime = null;
  
    function animation(currentTime) {
      if (startTime === null) startTime = currentTime;
      const timeElapsed = currentTime - startTime;
      const run = ease(timeElapsed, startPosition, distance, duration);
      window.scrollTo(0, run);
      if (timeElapsed < duration) {
        requestAnimationFrame(animation);
      }
    }
  
    // Easing function for a smoother start and end
    function ease(t, b, c, d) {
      t /= d / 2;
      if (t < 1) return c / 2 * t * t + b;
      t--;
      return -c / 2 * (t * (t - 2) - 1) + b;
    }
    requestAnimationFrame(animation);
}