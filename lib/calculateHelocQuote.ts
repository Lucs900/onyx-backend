<!-- HELOC CALCULATOR - ONYX Branded + Turnstile Protection -->
<div style="background:#ffffff; padding:50px 20px; border-radius:20px; max-width:760px; margin:40px auto; text-align:center; box-shadow:0 12px 50px rgba(255,106,0,0.2); color:#1a2338;">
  <h2 style="color:#FF6A00; font-size:38px; margin-bottom:16px;">🔥 Get Your Real California HELOC Quote</h2>
  <p style="font-size:19px; margin-bottom:35px; color:#334155;">Real numbers based on your home equity.</p>
 
  <div style="max-width:520px; margin:0 auto; text-align:left;">
    <label style="display:block; margin:12px 0 6px; font-weight:600;">Estimated Home Value ($)</label>
    <input id="homeValue" type="text" placeholder="650,000" onkeyup="formatInput(this)" style="width:100%; padding:15px; font-size:17px; border:2px solid #cbd5e1; border-radius:12px;">
    
    <label style="display:block; margin:12px 0 6px; font-weight:600;">Current Mortgage Balance ($)</label>
    <input id="mortgage" type="text" placeholder="350,000" onkeyup="formatInput(this)" style="width:100%; padding:15px; font-size:17px; border:2px solid #cbd5e1; border-radius:12px;">
    
    <label style="display:block; margin:12px 0 6px; font-weight:600;">Your FICO Score Range</label>
    <select id="fico" style="width:100%; padding:15px; font-size:17px; border:2px solid #cbd5e1; border-radius:12px;">
      <option value="">Select FICO Range</option>
      <option value="780">780+</option>
      <option value="760">760-779</option>
      <option value="740">740-759</option>
      <option value="720">720-739</option>
      <option value="700">700-719</option>
      <option value="680">680-699</option>
      <option value="660">660-679</option>
    </select>
    
    <label style="display:block; margin:12px 0 6px; font-weight:600;">Occupancy Type</label>
    <select id="occupancy" style="width:100%; padding:15px; font-size:17px; border:2px solid #cbd5e1; border-radius:12px;">
      <option value="">Select Occupancy</option>
      <option value="Primary">Primary Residence</option>
      <option value="Second">Second Home</option>
      <option value="Investment">Investment Property</option>
    </select>
  </div>

  <!-- Cloudflare Turnstile Widget -->
  <div style="margin: 30px auto; max-width: 520px; display: flex; justify-content: center;">
    <div class="cf-turnstile" data-sitekey="0x4AAAAAAEPIkXxgN6RB1-Hn" data-theme="light"></div>
  </div>
  
  <button onclick="calculateRealQuote()" style="margin-top:20px; background:#FF6A00; color:white; border:none; padding:18px 60px; font-size:20px; font-weight:bold; border-radius:50px; cursor:pointer; width:100%; max-width:520px;">
    Show My Real HELOC Quote →
  </button>
  
  <div id="results" style="display:none; margin-top:40px; padding:35px; background:#f8fafc; border:3px solid #FF6A00; border-radius:16px; text-align:left;">
    <h3 style="color:#FF6A00; text-align:center; margin-bottom:25px;">Your Transparent HELOC Quote</h3>
  
    <p><strong>Max HELOC Line Available:</strong> <span id="maxLine" style="font-size:28px; color:#FF6A00;"></span></p>
    <p><strong>Estimated Rate:</strong> <span id="rate" style="font-size:26px; color:#FF6A00;"></span></p>
    
    <div id="sliderSection" style="margin:30px 0;">
      <label style="display:block; margin-bottom:10px; font-weight:600;">How much would you like to pull today?</label>
      <input type="range" id="helocSlider" min="10000" step="5000" style="width:100%;" oninput="updateSliderValue()">
      <div style="display:flex; justify-content:space-between; font-size:15px; margin-top:8px;">
        <span>$10,000</span>
        <span id="sliderValue" style="font-weight:bold; color:#FF6A00;">$0</span>
        <span id="maxSlider" style="font-weight:bold;"></span>
      </div>
    </div>
    
    <p id="cashPullRow"><strong>Cash You Can Pull:</strong> <span id="cashPull" style="font-size:26px; color:#FF6A00;"></span></p>
    <p id="monthlyIORow"><strong>Est. Monthly Interest-Only:</strong> <span id="monthlyIO" style="font-size:24px;"></span></p>
    
    <div style="margin-top:40px; display:flex; gap:15px; flex-wrap:wrap; justify-content:center;">
      <button onclick="goToFloifyApplication()" style="background:#FF6A00; color:white; border:none; padding:16px 40px; font-size:18px; border-radius:50px; flex:1; min-width:210px;">Apply Now with This Amount</button>
      <button onclick="showEmailCapture()" style="background:#1a2338; color:white; border:none; padding:16px 40px; font-size:18px; border-radius:50px; flex:1; min-width:210px;">Have ONYX Review & Confirm</button>
    </div>
    
    <div id="emailCaptureBox" style="display:none; margin-top:25px; padding:25px; background:#f0f0f0; border-radius:12px;">
      <p style="margin-bottom:15px; font-weight:600;">Enter your details so ONYX can review & confirm this quote:</p>
      <input id="firstName" type="text" placeholder="First Name" style="width:100%; padding:14px; margin-bottom:12px; border:2px solid #ddd; border-radius:12px;">
      <input id="lastName" type="text" placeholder="Last Name" style="width:100%; padding:14px; margin-bottom:15px; border:2px solid #ddd; border-radius:12px;">
      <input id="captureEmail" type="email" placeholder="your@email.com" style="width:100%; padding:14px; margin-bottom:15px; border:2px solid #ddd; border-radius:12px;">
      <button onclick="captureLead()" style="background:#FF6A00; color:white; border:none; padding:14px 40px; font-size:17px; border-radius:50px; width:100%;">Submit to ONYX</button>
    </div>
    
    <div id="successBox" style="display:none; margin-top:25px; padding:30px; background:#e6f4ea; border:3px solid #34a853; border-radius:16px; text-align:center;">
      <h3 style="color:#34a853;">✅ Quote Received!</h3>
      <p id="successDetails" style="margin:20px 0; font-size:17px; line-height:1.6;"></p>
    </div>
  </div>
</div>

<!-- Turnstile Script -->
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>

<script>
function formatInput(input) {
  let val = input.value.replace(/[^0-9]/g, '');
  if (val) input.value = Number(val).toLocaleString('en-US');
}

function unformatNumber(str) {
  return parseFloat(str.replace(/,/g, '')) || 0;
}

let currentMaxLine = 0;
let currentHomeValue = 0;
let currentMortgage = 0;
let currentRate = 0;

async function calculateRealQuote() {
  currentHomeValue = unformatNumber(document.getElementById("homeValue").value);
  currentMortgage = unformatNumber(document.getElementById("mortgage").value);
  const fico = document.getElementById("fico").value;
  const occupancy = document.getElementById("occupancy").value;

  if (currentHomeValue < 100000 || !fico || !occupancy) {
    alert("Please fill in all fields to get your quote.");
    return;
  }

  // Get Turnstile token
  const turnstileToken = document.querySelector('[name="cf-turnstile-response"]')?.value;
  if (!turnstileToken) {
    alert("Please complete the captcha verification.");
    return;
  }

  const btn = document.querySelector('button[onclick="calculateRealQuote()"]');
  const originalText = btn.innerText;
  btn.innerText = "Calculating...";
  btn.disabled = true;

  try {
    const response = await fetch("https://onyx-backend-ten.vercel.app/api/heloc-quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        homeValue: currentHomeValue,
        mortgageBalance: currentMortgage,
        fico: Number(fico),
        occupancy: occupancy,
        turnstileToken: turnstileToken
      })
    });

    const data = await response.json();

    if (!data.success || !data.quote) {
      alert(data.error || "Sorry, we couldn't generate a quote right now. Please try again.");
      console.log(data);
      return;
    }

    const quote = data.quote;
    currentMaxLine = quote.maxLine || 0;
    currentRate = quote.rate || 0;

    document.getElementById("results").style.display = "block";

    if (currentMaxLine <= 0) {
      document.getElementById("maxLine").innerText = "Not Available";
      document.getElementById("rate").innerText = "—";
      document.getElementById("sliderSection").style.display = "none";
      document.getElementById("cashPullRow").style.display = "none";
      document.getElementById("monthlyIORow").style.display = "none";
    } else {
      document.getElementById("sliderSection").style.display = "block";
      document.getElementById("cashPullRow").style.display = "block";
      document.getElementById("monthlyIORow").style.display = "block";

      document.getElementById("maxLine").innerText = "$" + Number(currentMaxLine).toLocaleString('en-US');
      document.getElementById("maxSlider").innerText = "$" + Number(currentMaxLine).toLocaleString('en-US');
      document.getElementById("helocSlider").max = currentMaxLine;
      document.getElementById("helocSlider").value = Math.round(currentMaxLine * 0.75);

      updateSliderValue();
    }

    document.getElementById("results").scrollIntoView({ behavior: "smooth" });

  } catch (err) {
    console.error(err);
    alert("Connection error. Please try again.");
  } finally {
    btn.innerText = originalText;
    btn.disabled = false;
  }
}

function updateSliderValue() {
  const amount = parseFloat(document.getElementById("helocSlider").value) || 0;
  const monthlyIO = Math.round(amount * (currentRate / 100) / 12);

  document.getElementById("sliderValue").innerText = "$" + amount.toLocaleString('en-US');
  document.getElementById("cashPull").innerText = "$" + amount.toLocaleString('en-US');
  document.getElementById("monthlyIO").innerText = "$" + monthlyIO.toLocaleString('en-US');
  document.getElementById("rate").innerText = currentRate ? currentRate.toFixed(2) + "%" : "—";
}

function goToFloifyApplication() {
  window.open("https://onyxdirect.floify.com", "_blank");
}

function showEmailCapture() {
  document.getElementById("emailCaptureBox").style.display = "block";
}

async function captureLead() {
  const firstName = document.getElementById("firstName").value.trim();
  const lastName = document.getElementById("lastName").value.trim();
  const email = document.getElementById("captureEmail").value.trim();
  const amount = document.getElementById("cashPull").innerText || "N/A";
  const maxLine = document.getElementById("maxLine").innerText || "N/A";
  const rate = document.getElementById("rate").innerText || "N/A";
  const homeValue = document.getElementById("homeValue").value || "N/A";
  const ficoText = document.getElementById("fico").options[document.getElementById("fico").selectedIndex].text || "Not Selected";

  if (!email || !email.includes("@") || !firstName || !lastName) {
    alert("Please enter valid name and email.");
    return;
  }

  const webhookUrl = "https://hooks.zapier.com/hooks/catch/27627899/429b31g/";
  const leadData = {
    first_name: firstName,
    last_name: lastName,
    email: email,
    source: "HELOC Calculator - ONYX Review",
    notes: `HELOC Quote: Max Line ${maxLine}, Requested ${amount}, Rate ${rate}, Home Value ${homeValue}, FICO Range: ${ficoText}`,
  };

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(leadData),
      mode: "no-cors"
    });
  } catch (e) {
    console.error("Submission error:", e);
  }

  const successHTML = `Thank you!<br><br>Your customized HELOC quote has been received.<br>ONYX will review your details and contact you shortly at <strong>${email}</strong>.`;
  document.getElementById("successDetails").innerHTML = successHTML;
  document.getElementById("successBox").style.display = "block";
  document.getElementById("emailCaptureBox").style.display = "none";
}
</script>