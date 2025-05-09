
let currentUser = null;
let userAESKey = null;
let currentAssessment = {};
let userRole = null;
document.addEventListener("DOMContentLoaded", function() {
    checkLoginStatus();
    setupEventListeners();
    setupThemeToggle();
    loadCheckboxes();
    displayUserData(); 
});
// Check if a user is currently logged in
function checkLoginStatus() {
    currentUser = sessionStorage.getItem("currentUser");
    if (currentUser) {
        console.log(`Current user is: ${currentUser}`);
        userAESKey = sessionStorage.getItem("userAESKey");
        if (userAESKey) {
            console.log("AES key retrieved for user");
            // Load user role from localStorage
            const users = JSON.parse(localStorage.getItem("users")) || [];
            const userData = users.find(u => u.username === currentUser);
            if (userData) {
                userRole = userData.role || "user"; // Default to "user" if role not set
                // console.log(`User role: ${userRole}`);
                loadUserAssessment();
            } else {
                console.error("User data not found in localStorage");
                logout();
            }
        } else {
            console.error("AES key not found for logged in user");
            logout();
        }
    } else {
        if (!window.location.pathname.includes("login.html") && 
            !window.location.pathname.includes("signup.html") &&
            !window.location.pathname.includes("change-password.html")) {
            window.location.href = "Home_Page.html";
        }
    }
}
document.getElementById("change-password-btn").addEventListener("click", function (e) {
    window.location.href = "change-password.html";
    e.preventDefault();
});
// Load user assessment from localStorage (decrypt)
function loadUserAssessment() {
    const assessments = JSON.parse(localStorage.getItem("assessments")) || [];
    const userAssessment = assessments.find(a => a.username === currentUser);
    if (userAssessment && userAssessment.encryptedData) {
        try {
            const bytes = CryptoJS.AES.decrypt(userAssessment.encryptedData, userAESKey);
            const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
            currentAssessment = JSON.parse(decryptedData || "{}");
            console.log("Decrypted assessment:", currentAssessment);
            
            if (currentAssessment.score !== undefined) {
                const resultsSection = document.getElementById("results");
                if (resultsSection) {
                    resultsSection.style.display = "block";
                    updateScore();
                    generateRecommendations();
                }
            }
        } catch (error) {
            console.error("Failed to decrypt assessment data:", error);
            currentAssessment = {};
        }
    } else {
        currentAssessment = {};
    }
    loadCheckboxes();
}

// Load and persist checkbox states for dropdowns
function loadCheckboxes() {
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox =>{
        checkbox.removeEventListener("change", checkbox._changeHandler);
        if (currentAssessment[checkbox.name] !== undefined) {
            checkbox.checked = (currentAssessment[checkbox.name] === parseInt(checkbox.value));
            if (checkbox.checked) {
                const dropdown = checkbox.closest(".custom-dropdown");
                if (dropdown) {
                    const toggle = dropdown.querySelector(".dropdown-toggle");
                    if (toggle) {
                        toggle.textContent = checkbox.parentElement.textContent.trim();
                    }
                }
            }
        }
        checkbox._changeHandler = function() {
            if (checkbox.checked) {
                currentAssessment[checkbox.name] = parseInt(checkbox.value);
                const dropdown = checkbox.closest(".custom-dropdown");
                if (dropdown) {
                    dropdown.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                        if (cb !== checkbox) cb.checked = false;
                    });
                    const toggle = dropdown.querySelector(".dropdown-toggle");
                    if (toggle) {
                        toggle.textContent = checkbox.parentElement.textContent.trim();
                    }
                }
            } else {
                delete currentAssessment[checkbox.name];
            }
            updateScore();
        };
        checkbox.addEventListener("change", checkbox._changeHandler);
    });
}
// Update assessment score and display results
function updateScore() {
    const categories = {
        social: ['social_sharing', 'privacy_settings', 'different_usernames'],
        shopping: ['payment_info', 'read_policies', 'cookies'],
        password: ['password_management', 'two_factor', 'password_complexity'],
        network: ['public_wifi', 'vpn_usage', 'https_check'],
        device: ['updates', 'antivirus', 'screen_lock']
    };
    let totalScore = 0;
    const categoryScores = {};
    for (const [category, questions] of Object.entries(categories)) {
        let categoryScore = 0;
        let maxScore = questions.length * 3; // Max value per question is 3
        questions.forEach(question => {
            if (currentAssessment[question] !== undefined) {
                categoryScore += parseInt(currentAssessment[question]) || 0;
                console.log(`Question: ${question}, Value: ${currentAssessment[question]}`); // Debug
            } else {
                console.warn(`No value for ${question} in currentAssessment`);
            }
        });
        categoryScores[category] = Math.round((categoryScore / maxScore) * 100);
        totalScore += categoryScore;
        console.log(`Category: ${category}, Score: ${categoryScore}, Max: ${maxScore}, Percent: ${categoryScores[category]}%`); // Debug
    }
    const maxTotalScore = 15 * 3; // 5 categories * 3 questions * 3 max value
    const overallScore = Math.round((totalScore / maxTotalScore) * 100);
    const resultsSection = document.getElementById("results");
    if (resultsSection) {
        const scoreElement = document.getElementById("score");
        const riskLevelElement = document.getElementById("riskLevel");
        if (scoreElement && riskLevelElement) {
            scoreElement.textContent = overallScore;
            if (getRiskLevel(overallScore)) {
                scoreElement.style.color = getRiskColor(getRiskLevel(overallScore));
            }
            const riskLevel = getRiskLevel(overallScore);
            riskLevelElement.textContent = riskLevel;
            riskLevelElement.style.color = getRiskColor(riskLevel);
        }
        if (categoryScores.social !== undefined) {
            document.getElementById("socialScore").textContent = `${categoryScores.social}%`;
            document.getElementById("socialBar").style.width = `${categoryScores.social}%`;
        }
        if (categoryScores.shopping !== undefined) {
            document.getElementById("shoppingScore").textContent = `${categoryScores.shopping}%`;
            document.getElementById("shoppingBar").style.width = `${categoryScores.shopping}%`;
        }
        if (categoryScores.password !== undefined) {
            document.getElementById("passwordScore").textContent = `${categoryScores.password}%`;
            document.getElementById("passwordBar").style.width = `${categoryScores.password}%`;
        }
        if (categoryScores.network !== undefined) {
            document.getElementById("networkScore").textContent = `${categoryScores.network}%`;
            document.getElementById("networkBar").style.width = `${categoryScores.network}%`;
        }
        if (categoryScores.device !== undefined) {
            document.getElementById("deviceScore").textContent = `${categoryScores.device}%`;
            document.getElementById("deviceBar").style.width = `${categoryScores.device}%`;
        }
    }
    currentAssessment.score = overallScore;
    currentAssessment.categoryScores = categoryScores;
    console.log(`Overall Score: ${overallScore}, Total Score: ${totalScore}, Max Total: ${maxTotalScore}`); // Debug
}
// Determine risk level based on score
function getRiskLevel(score) {
    if (score >= 80) return "Critical Risk";
    if (score >= 60) return "High Risk";
    if (score >= 40) return "Moderate Risk";
    return "Low Risk";
}
// Get color for risk level
function getRiskColor(riskLevel) {
    switch (riskLevel) {
        case "Critical Risk":
        case "High Risk":
            return "#dc3545";
        case "Moderate Risk":
            return "#ffc107";
        case "Low Risk":
            return "#28a745";
        default:
            return "#000000";
    }
}
// Function to display assessment data on page load or after save
function displayAssessmentData() {
    const plainDataDiv = document.getElementById('plaindata');
    const encryptionDiv = document.getElementById('encryption');
    let assessments = JSON.parse(localStorage.getItem("assessments")) || [];
    const userAssessment = assessments.find(a => a.username === currentUser);

    if (userAssessment && userAssessment.encryptedData && userAESKey) {
        try {
            const bytes = CryptoJS.AES.decrypt(userAssessment.encryptedData, userAESKey);
            const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8) || '{}');
            if (plainDataDiv) plainDataDiv.textContent = `Collected Data: ${JSON.stringify(decryptedData)}`;
            if (encryptionDiv) {
                encryptionDiv.textContent = `Encrypted Data: ${userAssessment.encryptedData}`;
                encryptionDiv.innerHTML += `<br>AES Key: ${userAESKey}`;
            }
        } catch (error) {
            console.error("Error decrypting data for display:", error);
            if (plainDataDiv) plainDataDiv.textContent = 'Error displaying collected data.';
            if (encryptionDiv) encryptionDiv.textContent = 'Error displaying encrypted data.';
        }
    } else {
        if (plainDataDiv) plainDataDiv.textContent = 'No assessment data found.';
        if (encryptionDiv) encryptionDiv.textContent = 'No encrypted data available.';
    }
}
function saveAssessment() {
    try {
        let saveBtn = document.getElementById('saveBtn');
        if (!saveBtn) return;
        let assessments = JSON.parse(localStorage.getItem("assessments")) || [];
        const originalText = saveBtn.textContent;
        const originalClass = saveBtn.className;
        const plainDataDiv = document.getElementById('plaindata');
        if (plainDataDiv) plainDataDiv.textContent = 'Collecting data...';
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';
        setTimeout(() => {
            // Preserve current in-memory assessment
            const currentData = { ...currentAssessment };
            console.log("In-memory assessment before save:", JSON.stringify(currentData));
            // Load and decrypt existing assessment (if any)
            const userAssessment = assessments.find(a => a.username === currentUser);
            let decryptedData = {};
            if (userAssessment && userAssessment.encryptedData) {
                const bytes = CryptoJS.AES.decrypt(userAssessment.encryptedData, userAESKey);
                decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8) || '{}');
                console.log('Decrypted Assessment:', decryptedData);
            } else {
                // For new users, initialize with current data
                decryptedData = { ...currentData };
                if (plainDataDiv) plainDataDiv.textContent = `Collected Data: ${JSON.stringify(decryptedData)}`;
            }

            // Merge decrypted data with current in-memory data (current takes precedence)
            currentAssessment = { ...decryptedData, ...currentData };
            console.log("Merged assessment:", JSON.stringify(currentAssessment));
            // Update score with the merged data
            updateScore();
            // Encrypt and save data
            const encryptionDiv = document.getElementById('encryption');
            if (encryptionDiv) encryptionDiv.textContent = 'Encrypting data...';
            setTimeout(() => {
                const encrypted = CryptoJS.AES.encrypt(JSON.stringify(currentAssessment), userAESKey).toString();
                if (encryptionDiv) {
                    encryptionDiv.textContent = `Encrypted Data: ${encrypted}`;
                    encryptionDiv.innerHTML += `<br>AES Key: ${userAESKey}`;
                }
                const index = assessments.findIndex(a => a.username === currentUser);
                if (index !== -1) {
                    assessments[index].encryptedData = encrypted;
                } else {
                    assessments.push({ username: currentUser, encryptedData: encrypted });
                }
                localStorage.setItem("assessments", JSON.stringify(assessments));
                console.log("Saved assessments:", JSON.parse(localStorage.getItem("assessments")));

                saveBtn.innerHTML = '<i class="fas fa-check"></i> Saved';
                saveBtn.className = `${originalClass} saved-state`;

                setTimeout(() => {
                    saveBtn.textContent = originalText;
                    saveBtn.className = originalClass;
                    saveBtn.disabled = false;
                    displayAssessmentData(); // Update UI after save
                    displayUserData(); // Call existing function
                }, 1000);
            }, 2000);
        }, 2000);
    } catch (error) {
        console.error("Error saving assessment:", error);
        const plainDataDiv = document.getElementById('plaindata');
        if (plainDataDiv) plainDataDiv.textContent = 'Error collecting data.';
        const encryptionDiv = document.getElementById('encryption');
        if (encryptionDiv) encryptionDiv.textContent = 'Error encrypting data.';
        alert("Failed to save assessment. Please try again.");
        let saveBtn = document.getElementById('saveBtn');
        if (saveBtn) {
            saveBtn.textContent = originalText;
            saveBtn.className = originalClass;
            saveBtn.disabled = false;
        }
    }
}

// Run on page load to display existing assessment data
document.addEventListener('DOMContentLoaded', () => {
    if (currentUser && userAESKey) {
        displayAssessmentData();
    }
});
// Calculate risk and show results
function calculateRisk() {
    updateScore();
    const resultsSection = document.getElementById("results");
    if (resultsSection) {
        resultsSection.style.display = "block";
        generateRecommendations();
        window.scrollTo({ top: resultsSection.offsetTop, behavior: "smooth" });
    }
    displayUserData(); // Refresh displayed data after calculation
}

// Generate recommendations based on assessment
function generateRecommendations() {
    const recommendationsList = document.getElementById("recommendationsList");
    if (!recommendationsList) return;

    recommendationsList.innerHTML = "";
    const recommendations = [];

    if (currentAssessment.social_sharing >= 2) recommendations.push("Limit sharing personal information on social media to reduce exposure.");
    if (currentAssessment.privacy_settings >= 2) recommendations.push("Regularly review and update privacy settings on social media accounts.");
    if (currentAssessment.different_usernames >= 2) recommendations.push("Use unique usernames across platforms to prevent tracking.");
    if (currentAssessment.payment_info >= 2) recommendations.push("Avoid saving payment information on multiple websites.");
    if (currentAssessment.read_policies >= 2) recommendations.push("Read privacy policies before signing up for online services.");
    if (currentAssessment.cookies >= 2) recommendations.push("Limit acceptance of tracking cookies to essential ones only.");
    if (currentAssessment.password_management >= 2) recommendations.push("Use a password manager to create and store unique, strong passwords.");
    if (currentAssessment.two_factor >= 2) recommendations.push("Enable two-factor authentication on all accounts that support it.");
    if (currentAssessment.password_complexity >= 2) recommendations.push("Use complex passwords with at least 12 characters, including special characters.");
    if (currentAssessment.public_wifi >= 2) recommendations.push("Avoid using public WiFi without a VPN to protect your data.");
    if (currentAssessment.vpn_usage >= 2) recommendations.push("Use a reputable VPN service for secure browsing, especially on public networks.");
    if (currentAssessment.https_check >= 2) recommendations.push("Always verify HTTPS before entering sensitive information on websites.");
    if (currentAssessment.updates >= 2) recommendations.push("Update your operating system and applications promptly to patch vulnerabilities.");
    if (currentAssessment.antivirus >= 2) recommendations.push("Install and regularly update antivirus/anti-malware software.");
    if (currentAssessment.screen_lock >= 2) recommendations.push("Use strong screen locks with biometrics or complex passwords on all devices.");

    if (recommendations.length === 0) recommendations.push("Great job! Continue maintaining strong security practices.");

    recommendations.forEach(rec => {
        const li = document.createElement("li");
        li.textContent = rec;
        recommendationsList.appendChild(li);
    });
}

function displayUserData() {
    const userDataSection = document.getElementById("userDataSection");
    if (!userDataSection) return;
    userDataSection.innerHTML = "";

    if (userRole === "admin") {
        // Admin view: Show all users' data
        const assessments = JSON.parse(localStorage.getItem("assessments")) || [];
        const users = JSON.parse(localStorage.getItem("users")) || [];

        const adminHeader = document.createElement("h3");
        adminHeader.textContent = "All Users' Assessment Data";
        userDataSection.appendChild(adminHeader);

        assessments.forEach(assessment => {
            const user = users.find(u => u.username === assessment.username);
            if (!user) return;

            // Decrypt with the user's AES key (stored in sessionStorage for simplicity)
            const userKey = sessionStorage.getItem(`aesKey_${assessment.username}`) || userAESKey;
            let decryptedData = {};
            try {
                const bytes = CryptoJS.AES.decrypt(assessment.encryptedData, userKey);
                decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8) || "{}");
            } catch (error) {
                console.error(`Failed to decrypt data for ${assessment.username}:`, error);
                decryptedData = { error: "Unable to decrypt data" };
            }

            const userDiv = document.createElement("div");
            userDiv.className = "card mb-3";
            userDiv.innerHTML = `
                <div class="card-header">
                    <strong>Username: ${assessment.username}</strong> (Role: ${user.role})
                </div>
                <div class="card-body">
                    <pre>${JSON.stringify(decryptedData, null, 2)}</pre>
                </div>
            `;
            userDataSection.appendChild(userDiv);
        });
    } else {
        const userHeader = document.createElement("h3");
        userHeader.textContent = "Your Assessment Data";
        userDataSection.appendChild(userHeader);

        const userDiv = document.createElement("div");
        userDiv.className = "card mb-3";
        userDiv.innerHTML = `
            <div class="card-header">
                <strong>Username: ${currentUser}</strong>
            </div>
            <div class="card-body">
                <pre>${JSON.stringify(currentAssessment, null, 2)}</pre>
            </div>
        `;
        userDataSection.appendChild(userDiv);
    }
}
function downloadReport() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const pageWidth = 210; // A4 page width in mm
    const pageHeight = 297; // A4 page height in mm
    const centerX = pageWidth / 2; // Center of the page for alignment
    const margin = 10; // Margin for border inset
    // Draw border around the page content
    doc.setDrawColor(0, 0, 0); // Black border
    doc.setLineWidth(1); // Border thickness
    doc.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin); // Full page border
    // Title (Centered)
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Security Assessment Report", centerX, 20 + margin, { align: "center" });

    // Subtitle (Centered)
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, centerX, 30 + margin, { align: "center" });

    // User and Risk Level (Side by side)
    doc.setFontSize(14);
    doc.text(`User: ${currentUser}`, 20 + margin, 40 + margin);
    doc.text(`Risk Level: ${getRiskLevel(currentAssessment.score)}`, 130 + margin, 40 + margin);

    // Overall Score with Colored Circle
    doc.setFontSize(16);
    doc.text("Overall Score", centerX, 50 + margin, { align: "center" });

    // Draw colored circle at manually adjusted position
    const circleX = centerX; // Adjust this value (e.g., 105) to move left/right
    const circleY = 68 + margin; // Adjust this value (e.g., 65) to move up/down
    const circleRadius = 15; // Adjust radius if needed
    const riskLevel = getRiskLevel(currentAssessment.score);
    let circleColor;
    switch (riskLevel) {
        case "Critical Risk":
        case "High Risk":
            circleColor = "#dc3545"; // Red
            break;
        case "Moderate Risk":
            circleColor = "#ffc107"; // Yellow
            break;
        case "Low Risk":
            circleColor = "#28a745"; // Green
            break;
        default:
            circleColor = "#000000"; // Black
    }
    doc.setFillColor(circleColor);
    doc.circle(circleX, circleY, circleRadius, "F"); // Draw filled circle

    // Place score inside the circle
    doc.setFontSize(30);
    doc.setTextColor(255, 255, 255); // White text for contrast
    doc.text(`${currentAssessment.score}`, circleX, circleY + 3, { align: "center" }); // Adjust vertical offset (+2) if needed
    doc.setTextColor(0, 0, 0); // Reset to black

    // Category Scores (Left-aligned)
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Category Scores", 20 + margin, 90 + margin);
    let y = 100 + margin;
    const categoryNames = {
        social: "Social Media",
        shopping: "Online Shopping & Services",
        password: "Password Security",
        network: "Network Security",
        device: "Device Security"
    };
    for (const [category, score] of Object.entries(currentAssessment.categoryScores || {})) {
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.text(`${categoryNames[category] || category.charAt(0).toUpperCase() + category.slice(1)}: ${score}%`, 20 + margin, y);
        y += 10;
    }

    // Top Recommendations with Subheadings
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Top Recommendations", centerX, y + 3, { align: "center" });
    y += 20;

    const categories = {
        social: ['social_sharing', 'privacy_settings', 'different_usernames'],
        shopping: ['payment_info', 'read_policies', 'cookies'],
        password: ['password_management', 'two_factor', 'password_complexity'],
        network: ['public_wifi', 'vpn_usage', 'https_check'],
        device: ['updates', 'antivirus', 'screen_lock']
    };

    const recommendationMap = {
        social_sharing: "Limit sharing personal information on social media to reduce exposure.",
        privacy_settings: "Regularly review and update privacy settings on social media accounts.",
        different_usernames: "Use unique usernames across platforms to prevent tracking.",
        payment_info: "Use a dedicated credit card or virtual cards for online shopping.",
        read_policies: "Remove saved payment information from non-essential websites.",
        cookies: "Install a cookie manager and regularly clear tracking cookies.",
        password_management: "Use a password manager to create and store unique passwords.",
        two_factor: "Enable two-factor authentication on all important accounts.",
        password_complexity: "Create stronger passwords (12+ characters with mixed types).",
        public_wifi: "Use a VPN when on public WiFi networks.",
        vpn_usage: "Verify HTTPS connections before entering sensitive data.",
        https_check: "Secure your home network with WPA3 and a strong password.",
        updates: "Update your operating system and applications promptly to patch vulnerabilities.",
        antivirus: "Install and regularly update antivirus/anti-malware software.",
        screen_lock: "Secure your device with a strong PIN or biometric lock."
    };

    // Generate recommendations with subheadings
    for (const [category, questions] of Object.entries(categories)) {
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(categoryNames[category], 10 + margin, y);
        y += 10;
        doc.setFont("helvetica", "normal");

        questions.forEach(question => {
            if (currentAssessment[question] >= 2) {
                const recText = recommendationMap[question] || "No specific recommendation available.";
                const lines = doc.splitTextToSize(recText, 170);
                doc.text(lines, 30 + margin, y); // Indent recommendations slightly
                y += lines.length * 5;
            }
        });
        y += 5; // Add spacing between categories
    }

    doc.save(`Security_Assessment_${currentUser}.pdf`);
}
// Set up event listeners
function setupEventListeners() {
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) logoutBtn.addEventListener("click", function(e) { e.preventDefault(); logout(); });

    const saveBtn = document.getElementById("saveBtn");
    if (saveBtn) saveBtn.addEventListener("click", function() { saveAssessment(); });

    const printBtn = document.getElementById("printBtn");
    if (printBtn) printBtn.addEventListener("click", function() { window.print(); });

    const calculateBtn = document.getElementById("calculateBtn");
    if (calculateBtn) calculateBtn.addEventListener("click", function() { calculateRisk(); });
}

// Logout function
function logout() {
    sessionStorage.removeItem("currentUser");
    sessionStorage.removeItem("userAESKey");
    currentUser = null;
    userAESKey = null;
    userRole = null;
    currentAssessment = {};
    window.location.href = "Home_page.html";
}

// Theme toggle
function setupThemeToggle() {
    const themeToggle = document.getElementById("themeToggle");
    if (themeToggle) {
        themeToggle.addEventListener("click", function() {
            document.body.classList.toggle("dark-mode");
            localStorage.setItem("theme", document.body.classList.contains("dark-mode") ? "dark" : "light");
        });
        
        const savedTheme = localStorage.getItem("theme");
        if (savedTheme === "dark") document.body.classList.add("dark-mode");
    }
}
function testPassword() {
    const password = document.getElementById('passwordTest').value;
    const results = document.getElementById('passwordResults');
    
    if (!password) {
        results.innerHTML = '<p style="color: #dc3545;">Please enter a password to test.</p>';
        return;
    }
    
    // Calculate password strength
    const strength = calculatePasswordStrength(password);
    let color, message;
    
    if (strength < 30) {
        color = '#dc3545'; // red
        message = 'Very Weak: This password could be cracked instantly.';
    } else if (strength < 50) {
        color = '#ffc107'; // yellow
        message = 'Weak: This password offers minimal protection.';
    } else if (strength < 70) {
        color = '#fd7e14'; // orange
        message = 'Moderate: This password provides some protection.';
    } else if (strength < 90) {
        color = '#28a745'; // green
        message = 'Strong: This password offers good protection.';
    } else {
        color = '#20c997'; // teal
        message = 'Very Strong: This password offers excellent protection.';
    }
    
    // Calculate estimated time to crack (simplified)
    const crackTime = estimateCrackTime(password);
    
    // Entropy calculation (simplified)
    const entropy = calculateEntropy(password);
    
    results.innerHTML = `
        <div style="padding: 10px; background-color: ${color}; color: white; border-radius: 4px;">
            <p><strong>${message}</strong></p>
            <p>Estimated time to crack: ${crackTime}</p>
            <p>Password entropy: ~${entropy} bits</p>
        </div>
        <div style="margin-top: 10px; font-size: 0.9em;">
            <p><strong>Analysis:</strong></p>
            <ul>
                ${password.length < 8 ? '<li>Too short: Password should be at least 8 characters.</li>' : ''}
                ${!/[A-Z]/.test(password) ? '<li>Missing uppercase letters.</li>' : ''}
                ${!/[a-z]/.test(password) ? '<li>Missing lowercase letters.</li>' : ''}
                ${!/[0-9]/.test(password) ? '<li>Missing numbers.</li>' : ''}
                ${!/[^A-Za-z0-9]/.test(password) ? '<li>Missing special characters.</li>' : ''}
                ${(/(.)\1{2,}/.test(password)) ? '<li>Contains repeating characters.</li>' : ''}
                ${isCommonPassword(password) ? '<li>Similar to common passwords.</li>' : ''}
            </ul>
        </div>`
}
function calculatePasswordStrength(password) {
    // Basic password strength calculation
    let strength = 0;
    
    // Length contribution (up to 50 points)
    strength += Math.min(50, password.length * 5);
    // Character variety contribution
    if (/[A-Z]/.test(password)) strength += 10; // uppercase
    if (/[a-z]/.test(password)) strength += 10; // lowercase
    if (/[0-9]/.test(password)) strength += 10; // digits
    if (/[^A-Za-z0-9]/.test(password)) strength += 15; // special chars
    
    // Deductions
    if (/(.)\1{2,}/.test(password)) strength -= 15; // repeating characters
    if (isCommonPassword(password)) strength -= 30; // common password patterns
    
    return Math.max(0, Math.min(100, strength));
}

// Calculate password entropy
function calculateEntropy(password) {
    let poolSize = 0;
    if (/[a-z]/.test(password)) poolSize += 26;
    if (/[A-Z]/.test(password)) poolSize += 26;
    if (/[0-9]/.test(password)) poolSize += 10;
    if (/[^A-Za-z0-9]/.test(password)) poolSize += 33;
    
    const entropy = Math.round(Math.log2(Math.pow(poolSize, password.length)));
    return entropy;
}

// Estimate time to crack password
function estimateCrackTime(password) {
    // Very simplified crack time estimation (just for educational purposes)
    const entropy = calculateEntropy(password);
    
    if (entropy < 28) return "Instant";
    if (entropy < 36) return "Minutes to hours";
    if (entropy < 60) return "Days to weeks";
    if (entropy < 80) return "Years";
    return "Centuries";
}

function isCommonPassword(password) {
    const lowerPass = password.toLowerCase();
    const commonPatterns = [
        'password', '123456', 'qwerty', 'admin', 'welcome',
        'letmein', 'monkey', 'abc123', '111111', '12345'
    ];
    return commonPatterns.some(pattern => lowerPass.includes(pattern));
}
const togglePassword = document.getElementById('togglePassword');
    const passwordTest = document.getElementById('passwordTest');
    
    if (togglePassword && passwordTest) {
        togglePassword.addEventListener('click', function() {
            const type = passwordTest.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordTest.setAttribute('type', type);
            this.querySelector('i').classList.toggle('fa-eye');
            this.querySelector('i').classList.toggle('fa-eye-slash');
        });
    }
// ################# Cease Cipher #################

function caesarCipher() {
    const text = document.getElementById('plaintext').value;
    const shift = parseInt(document.getElementById('shift').value) || 3;
    const results = document.getElementById('cipherResults');
    
    if (!text) {
        results.innerHTML = '<p style="color: #dc3545;">Please enter text to encrypt/decrypt.</p>';
        return;
    }
    const encrypted = applyCaesarCipher(text, shift);
    const decrypted = applyCaesarCipher(encrypted, (26 - shift) % 26);
    results.innerHTML = `
        <div style="margin: 10px 0;">
            <strong>Original:</strong> ${text}
        </div>
        <div style="margin: 10px 0;">
            <strong>Encrypted (shift=${shift}):</strong> <span style="font-family: monospace;">${encrypted}</span>
        </div>
        <div style="margin: 10px 0;">
            <strong>Decrypted:</strong> ${decrypted}
        </div>
        <div style="margin-top: 15px; font-size: 0.9em; color: #666;">
            <p>The Caesar cipher is one of the simplest encryption techniques. Each letter in the plaintext is shifted a certain number of places down the alphabet.</p>
        </div>
    `;
}
function applyCaesarCipher(text, shift) {
    return text.split('').map(char => {
        if (char.match(/[a-z]/i)) {
            const code = char.charCodeAt(0);
            let shiftedCode;
            
            if (code >= 65 && code <= 90) { // Uppercase
                shiftedCode = ((code - 65 + shift) % 26) + 65;
            } else if (code >= 97 && code <= 122) { // Lowercase
                shiftedCode = ((code - 97 + shift) % 26) + 97;
            }
            
            return String.fromCharCode(shiftedCode);
        }
        return char;
    }).join('');
}   
// ###################### Sign Message ####################
let privateKey, publicKey;
if (localStorage.getItem('privateKey') && localStorage.getItem('publicKey')) {
    privateKey = localStorage.getItem('privateKey');
    publicKey = localStorage.getItem('publicKey');
    crypt.setPrivateKey(privateKey);
    crypt.setPublicKey(publicKey);
    console.log("Using existing RSA keys from local storage");
} else {
    generateKeyPair();
}
function generateKeyPair() {
    const rsaKeypair = KEYUTIL.generateKeypair("RSA", 2048); // Generate RSA key pair (2048 bits)
    privateKey = KEYUTIL.getPEM(rsaKeypair.prvKeyObj, "PKCS1PRV"); // PEM format private key
    publicKey = KEYUTIL.getPEM(rsaKeypair.pubKeyObj, "PKCS8PUB"); // PEM format public key
      // console.log("Private Key: ", privateKey);
    // console.log("Public Key: ", publicKey);
  }
  
function signMessage() {
    const message = document.getElementById("signMessage").value;
  
    if (!message) {
      alert("Please enter a message to sign.");
      return;
    }
  
    if (!privateKey) {
      alert("RSA keys are not generated. Please refresh the page to generate the key pair.");
      return;
    }
  
    // Create RSA private key object
    const rsa = new KJUR.crypto.Signature({ "alg": "SHA256withRSA" });
    rsa.init(privateKey);
    rsa.updateString(message);
  
    // Sign the message
    const signature = rsa.sign();
  
    // Display the signature
    document.getElementById("signatureOutput").textContent = signature;
  }
  // Function to verify the signature using the RSA public key
function verifySignature() {
    const message = document.getElementById("verifyMessage").value;
    const signature = document.getElementById("verifySignature").value;
  
    // Check if message or signature is empty
    if (!message || !signature) {
      alert("Please enter both the message and signature.");
      return;
    }
  
    if (!publicKey) {
      alert("RSA keys are not generated. Please refresh the page to generate the key pair.");
      return;
    }
  
    // Create RSA public key object
    const rsa = new KJUR.crypto.Signature({ "alg": "SHA256withRSA" });
    rsa.init(publicKey);
    rsa.updateString(message);
  
    // Verify the signature
    const isValid = rsa.verify(signature);
  
    // Display the verification result
    const resultElement = document.getElementById("verificationResult");
    if (isValid) {
      resultElement.textContent = "Signature is valid.";
      resultElement.classList.remove("alert-danger");
      resultElement.classList.add("alert-success");
    } else {
      resultElement.textContent = "Signature is not valid.";
      resultElement.classList.remove("alert-success");
      resultElement.classList.add("alert-danger");
    }
  }
// ######################### Generate Hash ###################################
  async function generateHash() {
    const input = document.getElementById('shaInput').value.trim();
    const results = document.getElementById('hashResult');
    
    if (!input) {
        results.innerHTML = '<div class="alert alert-warning">⚠️ Please enter text to hash.</div>';
        return;
    }

    try {
        // Hash using Web Crypto API
        const sha256 = await hashText(input, 'SHA-256');
        const sha512 = await hashText(input, 'SHA-512');
        results.innerHTML = `
            <div class="card shadow-sm">
                <div class="card-header bg-dark text-white"><strong>Hash Results</strong></div>
                <div class="card-body">
                    <h5>Input Text</h5>
                    <p>${input.length > 100 ? input.substring(0, 100) + '...' : input}</p>

                    <h5 class="mt-3">SHA-256</h5>
                    <textarea readonly class="form-control" style="font-family: monospace;">${sha256}</textarea>

                    <h5 class="mt-3">SHA-512</h5>
                    <textarea readonly class="form-control" style="font-family: monospace;">${sha512}</textarea>
                </div>
                <div class="card-footer text-muted small">
                    Cryptographic hashes are one-way functions for verifying data integrity and storing passwords securely.
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Hash generation error:', error);
        results.innerHTML = `<div class="alert alert-danger">❌ Error: ${error.message}</div>`;
    }
}
async function hashText(message, algorithm = 'SHA-256') {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest(algorithm, msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
// ######################### Difflie Helmen ###########################
function performDiffieHellman() {
    const p = parseInt(document.getElementById('prime').value);  // Prime number (Public value)
    const g = parseInt(document.getElementById('generator').value);  // Generator (Public value)
    // Validate prime and generator inputs
    if (isNaN(p) || isNaN(g) || p <= 1 || g <= 1 || !isPrime(p)) {
      alert("Please enter valid prime and generator values! Prime must be greater than 1 and valid.");
      return;
    }
    const alicePrivate = Math.floor(Math.random() * (p - 2)) + 2;  // Random private key between 2 and p-1
    const bobPrivate = Math.floor(Math.random() * (p - 2)) + 2;    // Random private key between 2 and p-1

    // Validate private keys
    if (alicePrivate <= 1 || bobPrivate <= 1 || alicePrivate >= p || bobPrivate >= p) {
      alert("Private values must be between 2 and p-1!");
      return;
    }

    // Alice's public computation
    const alicePublic = modExp(g, alicePrivate, p); // g^alicePrivate % p
    document.getElementById('alicePrivate').value = alicePrivate;  // Display private key for Alice
    document.getElementById('alicePublic').textContent = alicePublic;

    // Bob's public computation
    const bobPublic = modExp(g, bobPrivate, p); // g^bobPrivate % p
    document.getElementById('bobPrivate').value = bobPrivate;  // Display private key for Bob
    document.getElementById('bobPublic').textContent = bobPublic;

    // Alice computes the shared secret using Bob's public value
    const aliceSecret = modExp(bobPublic, alicePrivate, p); // bobPublic^alicePrivate % p
    document.getElementById('aliceSecret').textContent = aliceSecret;

    // Bob computes the shared secret using Alice's public value
    const bobSecret = modExp(alicePublic, bobPrivate, p); // alicePublic^bobPrivate % p
    document.getElementById('bobSecret').textContent = bobSecret;
    // Ensure both secrets are the same
    if (aliceSecret !== bobSecret) {
      alert("Key exchange failed! Shared secrets do not match.");
    } else {
      alert("Key exchange successful! Shared secret: " + aliceSecret);
    }
  }

  // Function to compute (base^exp) % mod efficiently using modular exponentiation
  function modExp(base, exp, mod) {
    let result = 1;
    base = base % mod;
    while (exp > 0) {
      if (exp % 2 === 1) {
        result = (result * base) % mod;
      }
      exp = Math.floor(exp / 2);
      base = (base * base) % mod;
    }
    return result;
  }
  // Function to check if a number is prime
  function isPrime(num) {
    if (num <= 1) return false;
    for (let i = 2; i <= Math.sqrt(num); i++) {
      if (num % i === 0) return false;
    }
    return true;
  }
