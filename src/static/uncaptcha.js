(function(){
  /**
   * CONFIGURATION
   * This JS file is hosted on GitHub Pages.
   * It automatically injects the necessary CSS and Images.
   */
  
  // 1. AUTO-INJECT CSS from your GitHub Pages
  // Make sure your GitHub repository is named "unCAPTCHA-python" and Pages is active.
  const cssUrl = "https://po2432.github.io/unCAPTCHA-python/uncaptcha.css";
  
  if (!document.querySelector(`link[href="${cssUrl}"]`)) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = cssUrl;
    document.head.appendChild(link);
  }

  // 2. LOGO URL (Hosted on GitHub Raw or Pages)
  const logoUrl = "https://raw.githubusercontent.com/Po2432/unCAPTCHA/main/uncaptcha.png";

  // --- MAIN WIDGET LOGIC ---
  const scripts = document.querySelectorAll('script[src$="uncaptcha.js"]');
  const scriptTag = scripts[scripts.length - 1];
  
  const mode = scriptTag ? scriptTag.getAttribute("data-mode") || "auto" : "auto";
  const theme = scriptTag ? scriptTag.getAttribute("data-theme") || "light" : "light";

  document.addEventListener("DOMContentLoaded", () => {
    const parent = scriptTag.parentElement;
    const widget = document.createElement("div");
    widget.className = `uncaptcha-widget uncaptcha-${theme}`;
    
    // HTML Structure
    widget.innerHTML = `
      <div class="uncaptcha-row">
        <!-- HONEYPOT (Invisible) -->
        <input type="text" class="uncaptcha-honeypot" name="website_url" tabindex="-1" autocomplete="off">
        
        <div class="checkbox-animation"></div>
        <span class="uncaptcha-text">I’m not a robot</span>
        
        <!-- INFO POPUP BUTTON -->
        <button class="popup-btn" type="button" style="display:none">
          <svg width="16" height="16" viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>
        </button>
        
        <!-- LOGO LINK -->
        <a href="https://github.com/Po2432/unCAPTCHA" target="_blank" class="uncaptcha-logo-link">
          <img src="${logoUrl}" alt="logo" class="uncaptcha-logo" />
        </a>
      </div>
      
      <!-- IMAGE CHALLENGE -->
      <div class="uncaptcha-challenge" style="display:none">
        <p class="challenge-instruction"></p>
        <div class="challenge-grid"></div>
        <button class="challenge-verify" type="button">Verify</button>
      </div>

      <!-- SLIDER CHALLENGE -->
      <div class="uncaptcha-slider-container" style="display:none">
        <p class="slider-text">Align the handle with the blue box</p>
        <div class="slider-track">
            <div class="slider-target"></div>
            <div class="slider-handle">➜</div>
        </div>
      </div>
    `;
    parent.insertBefore(widget, scriptTag);

    // Select Elements
    const checkbox = widget.querySelector(".uncaptcha-row");
    const honeypot = widget.querySelector(".uncaptcha-honeypot");
    const anim = widget.querySelector(".checkbox-animation");
    const textSpan = widget.querySelector(".uncaptcha-text");
    const challengeDiv = widget.querySelector(".uncaptcha-challenge");
    const grid = widget.querySelector(".challenge-grid");
    const verifyBtn = widget.querySelector(".challenge-verify");
    const instruction = widget.querySelector(".challenge-instruction");
    const popupBtn = widget.querySelector(".popup-btn");
    const logoLink = widget.querySelector(".uncaptcha-logo-link");
    
    const sliderContainer = widget.querySelector(".uncaptcha-slider-container");
    const sliderTrack = widget.querySelector(".slider-track");
    const sliderHandle = widget.querySelector(".slider-handle");
    const sliderTarget = widget.querySelector(".slider-target");

    const logoImg = widget.querySelector(".uncaptcha-logo");
    logoImg.onerror = () => logoImg.style.opacity = '0.5';

    let currentChallengeId = null;
    let locked = false; 
    let telemetry = { mousePath: [] };
    
    // Telemetry
    document.addEventListener('mousemove', (e) => {
      telemetry.mousePath.push({x: e.clientX, y: e.clientY, time: Date.now()});
      if (telemetry.mousePath.length > 200) telemetry.mousePath.shift(); 
    });

    // 1. CLICK CHECKBOX
    checkbox.addEventListener("click", () => {
      if(locked || anim.classList.contains("loading")) return;
      
      anim.className = "checkbox-animation loading";
      
      // CALL THE PYTHON BACKEND (uncaptcha.py routes)
      fetch('/api/request_check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: mode, telemetry: telemetry })
      })
      .then(res => res.json())
      .then(data => {
        if (data.status === "pass") {
          setTimeout(() => { successState(); }, 600);
        } else if (data.status === "challenge") {
          currentChallengeId = data.challenge_id;
          setupChallenge(data);
          setTimeout(() => {
            challengeDiv.style.display = "block";
            popupBtn.style.display = "block";
            anim.className = "checkbox-animation";
          }, 600);
        }
      })
      .catch(err => {
        console.error("Backend Error:", err);
        failState("Server Error");
      });
    });

    // Stop Propagation for inner elements
    popupBtn.addEventListener("click", (e) => {
      e.stopPropagation(); 
      challengeDiv.classList.add("popup");
    });

    logoLink.addEventListener("click", (e) => {
      e.stopPropagation();
    });

    // 2. CLICK VERIFY
    verifyBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if(locked) return;
      const selectedImgs = [...grid.querySelectorAll("img.selected")];
      const selectedIndices = selectedImgs.map(img => parseInt(img.dataset.id));

      verifyBtn.innerText = "Checking...";
      verifyBtn.disabled = true;

      fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challenge_id: currentChallengeId,
          selected: selectedIndices,
          honeypot: honeypot.value
        })
      })
      .then(res => res.json())
      .then(response => {
        if(response.success && response.status === "verified"){
           successState();
        } 
        else if(response.status === "secondary_required"){
           // Trigger Slider
           verifyBtn.innerText = "Verify"; 
           verifyBtn.disabled = false;     
           verifyBtn.style.display = "none"; 
           challengeDiv.style.display = "none"; 
           startSliderChallenge(response.target_position);
        }
        else {
          failState(response.reason || "Verification failed.");
        }
      })
      .catch(err => {
         console.error(err);
         failState("Network Error");
      });
    });

    // --- SLIDER LOGIC ---
    function startSliderChallenge(targetPercent) {
        sliderContainer.style.display = "block";
        sliderTarget.style.left = `calc(${targetPercent}% - 20px)`; 
        
        let isDragging = false;

        const onMove = (clientX) => {
            if(!isDragging) return;
            const rect = sliderTrack.getBoundingClientRect();
            let x = clientX - rect.left;
            let percent = (x / rect.width) * 100;
            if (percent < 0) percent = 0;
            if (percent > 100) percent = 100;
            sliderHandle.style.left = `calc(${percent}% - 20px)`; 
            sliderHandle.dataset.currentPercent = percent;
        };

        const onEnd = () => {
            if(!isDragging) return;
            isDragging = false;
            
            const finalPercent = parseFloat(sliderHandle.dataset.currentPercent || 0);
            
            fetch('/api/verify_slider', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    challenge_id: currentChallengeId,
                    position: finalPercent
                })
            })
            .then(res => res.json())
            .then(data => {
                if(data.success) {
                    successState();
                } else {
                    failState("Alignment failed.");
                }
            })
            .catch(() => failState("Network Error"));
            
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        const onMouseMove = (e) => onMove(e.clientX);
        const onMouseUp = () => onEnd();

        sliderHandle.addEventListener('mousedown', () => {
            isDragging = true;
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    }

    // --- STATES ---

    function successState(){
        anim.className = "checkbox-animation success tick";
        challengeDiv.style.display = "none";
        sliderContainer.style.display = "none";
        challengeDiv.classList.remove("popup");
        popupBtn.style.display = "none";
        
        textSpan.textContent = "I’m not a robot";
        textSpan.style.color = "#333";
        locked = true;
    }

    function failState(reason){
        anim.className = "checkbox-animation fail cross";
        challengeDiv.style.display = "none";
        sliderContainer.style.display = "none";
        challengeDiv.classList.remove("popup");
        popupBtn.style.display = "none";
        
        textSpan.textContent = reason;
        textSpan.style.color = "#d93025"; 
        
        locked = true; // Permanently fail
        checkbox.style.opacity = "0.7";
        checkbox.style.cursor = "not-allowed";
    }

    function setupChallenge(data){
      grid.innerHTML = "";
      instruction.textContent = data.instruction;
      data.images.forEach(item => {
        const img = document.createElement("img");
        img.src = item.src;
        img.dataset.id = item.id;
        img.onerror = function() {
            this.src = "https://placehold.co/100x100/dddddd/333333?text=Error";
        };
        img.addEventListener("click", () => img.classList.toggle("selected"));
        grid.appendChild(img);
      });
    }

  });
})();