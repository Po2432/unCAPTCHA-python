# unCAPTCHA Python
![python logo](https://www.python.org/static/community_logos/python-powered-w-140x56.png)

# ⚠️~~THIS CAPTCHA HAS MANY VULNERABILITIES AND COULD BE REWRITTENT~~ - USE ON YOUR OWN RISK :warning:
# Most of the VULNERABILITIES were patched and rewrite will not happen. Still use on your own risk. Solver-proof audio CAPTCHA coming on next version.
**unCAPTCHA** is a privacy-first, fully self-hosted, and source-available CAPTCHA solution.
It uses a unique **"Hybrid Architecture"**:
1.  **The Brain (Backend):** Runs locally on **your** server (Python). No user data ever leaves your machine.
2.  **The Face (Frontend):** Served via CDN (GitHub), ensuring you always have the latest UI, styles, and bug fixes without needing to update your code.


## 🌟 Features

*   **🔒 Logic is Self-Hosted:** You own the logic. No external API keys required.
*   **🧠 Advanced Bot Detection:**
    *   **Telemetry Analysis:** Detects linear mouse movements and robotic clicks.
    *   **Speed Trap:** Rejects solutions submitted inhumanly fast (< 1s).
    *   **Ghost Slider:** Triggers a secondary "Slide-to-Verify" challenge if the user is suspicious (1s - 4s).
*   **🍯 Honeypot Protection:** Invisible fields to trap dumb bots immediately.
*   **⚡ Auto-Verification:** Legitimate users are verified instantly without clicking images.
*   **🎨 Zero-Config UI:** The CSS and JS are auto-injected from the CDN. Just add one line of HTML.

---

## 🚀 Installation Guide

### 1. Download the Backend
Download the **`uncaptcha.py`** file from releases and place it in your project folder next to your main application file.

### 2. Install Dependencies
You only need Flask (standard for Python web apps).

```bash
pip install flask
```

### 3. Initialize in your Backend
In your main Flask application (e.g., `app.py`), import and register the unCAPTCHA blueprint.

```python
from flask import Flask, session
from uncaptcha import uncaptcha_bp  # Import the file you downloaded

app = Flask(__name__)
app.secret_key = "REPLACE_WITH_A_SECURE_KEY" # Required for session security

# Register the unCAPTCHA routes
app.register_blueprint(uncaptcha_bp)

# ... your existing code ...
```

### 4. Add to your Frontend
Add the following script tag to any page where you want the CAPTCHA to appear (e.g., inside your `<form>`).

```html
<!-- This loads the JS, CSS, and Logo automatically -->
<script 
    src="https://po2432.github.io/unCAPTCHA-python/uncaptcha.js" 
    data-mode="auto" 
    data-theme="light">
</script>
```

---

## 💻 Usage Example

Here is a full example of a protected Login Route.

### The HTML Form (`login.html`)

```html
<form action="/login" method="POST">
    <input type="text" name="username" placeholder="Username">
    <input type="password" name="password" placeholder="Password">

    <!-- The unCAPTCHA Widget -->
    <script src="https://po2432.github.io/unCAPTCHA-python/uncaptcha.js" data-mode="auto"></script>

    <button type="submit">Login</button>
</form>
```

### The Python Route (`app.py`)

```python
@app.route('/login', methods=['POST'])
def login():
    # 1. Check if the user passed the CAPTCHA
    if not session.get('captcha_verified'):
        return "Bot detected! Access Denied.", 403

    # 2. If passed, clear the flag (so it can't be reused)
    session.pop('captcha_verified', None)

    # 3. Perform your actual login logic
    username = request.form['username']
    password = request.form['password']
    
    return f"Welcome human, {username}!"
```

---

## ⚙️ Configuration

You can configure the behavior using HTML attributes on the script tag:

| Attribute | Value | Description |
| :--- | :--- | :--- |
| `data-mode` | `auto` | **(Recommended)** Analyzes mouse behavior. If human, passes instantly. If suspicious, shows images. |
| `data-mode` | `always` | Forces the image challenge every single time. |
| `data-theme` | `light` | Standard white background theme. |
| `data-theme` | `dark` | Dark mode for dark websites. |

---

## 🛡️ Security Architecture

| Layer | Defense Mechanism |
| :--- | :--- |
| **Layer 1** | **Honeypot:** Hidden input fields trap automated scripts that scan the HTML. |
| **Layer 2** | **Telemetry:** Mouse movements are analyzed for linearity and speed on the server. |
| **Layer 3** | **Speed Trap:** Submissions under 1.0s are rejected. Submissions under 4.0s trigger the Slider. |
| **Layer 4** | **Obscurity:** Unlike reCAPTCHA, generic solver extensions do not recognize the unCAPTCHA DOM structure. |

---

## 📄 License

Distributed under the Po2432's Source Available License 1.0.
> "Freedom is the right to tell people what they do not want to hear."
>
> — George Orwell

**unCAPTCHA was built to stop large companies monetizing basic protection.**
