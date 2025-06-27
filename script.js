// Global variables
let currentStep = 1
let formData = {}
const signaturePads = {}
const SignaturePad = window.SignaturePad // Declare the SignaturePad variable

// Initialize the application
document.addEventListener("DOMContentLoaded", () => {
  initializeSignaturePads()
  setCurrentDate()
  initializeValidation()
  initializeAnimations()
})

// Initialize animations and interactions
function initializeAnimations() {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: "0px 0px -50px 0px",
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.style.animationPlayState = "running"
      }
    })
  }, observerOptions)

  // Observe animated elements
  document.querySelectorAll(".glass-card, .step-item").forEach((el) => {
    observer.observe(el)
  })

  // Add smooth scroll behavior
  document.documentElement.style.scrollBehavior = "smooth"
}

// Initialize signature pads with the professional signature_pad library
function initializeSignaturePads() {
  const canvasIds = ["submitterSignature", "receiverSignature"]

  canvasIds.forEach((canvasId) => {
    const canvas = document.getElementById(canvasId)
    if (canvas) {
      // Set canvas dimensions properly
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width
      canvas.height = rect.height

      // Initialize SignaturePad with enhanced options
      const signaturePad = new SignaturePad(canvas, {
        backgroundColor: "rgba(255, 255, 255, 1)",
        penColor: "#1e293b",
        minWidth: 1.5,
        maxWidth: 3,
        throttle: 16,
        minDistance: 5,
        velocityFilterWeight: 0.7,
      })

      // Get overlay element
      const overlayId = canvasId + "Overlay"
      const overlay = document.getElementById(overlayId)

      // Handle signature start
      signaturePad.addEventListener("beginStroke", () => {
        if (overlay) {
          overlay.style.opacity = "0"
          overlay.style.pointerEvents = "none"
        }
        clearValidationError(canvasId.replace("Signature", "SignatureError"))
      })

      // Handle signature end - keep overlay hidden if there's content
      signaturePad.addEventListener("endStroke", () => {
        if (overlay && !signaturePad.isEmpty()) {
          overlay.style.opacity = "0"
        }
      })

      // Resize canvas function
      function resizeCanvas() {
        const ratio = Math.max(window.devicePixelRatio || 1, 1)
        const rect = canvas.getBoundingClientRect()

        // Store current signature data
        const signatureData = signaturePad.toData()

        // Resize canvas
        canvas.width = rect.width * ratio
        canvas.height = rect.height * ratio
        canvas.style.width = rect.width + "px"
        canvas.style.height = rect.height + "px"

        const ctx = canvas.getContext("2d")
        ctx.scale(ratio, ratio)

        // Restore signature data
        signaturePad.fromData(signatureData)

        // Show overlay if canvas is empty
        if (signaturePad.isEmpty() && overlay) {
          overlay.style.opacity = "0.6"
          overlay.style.pointerEvents = "none"
        }
      }

      // Initial setup
      resizeCanvas()

      // Handle window resize
      window.addEventListener("resize", resizeCanvas)

      // Store signature pad instance
      const type = canvasId.includes("submitter") ? "submitter" : "receiver"
      signaturePads[type] = {
        pad: signaturePad,
        canvas: canvas,
        overlay: overlay,
        isEmpty: () => signaturePad.isEmpty(),
        clear: () => {
          signaturePad.clear()
          if (overlay) {
            overlay.style.opacity = "0.6"
            overlay.style.pointerEvents = "none"
          }
        },
        undo: () => {
          const data = signaturePad.toData()
          if (data.length > 0) {
            data.pop()
            signaturePad.fromData(data)
            if (data.length === 0 && overlay) {
              overlay.style.opacity = "0.6"
              overlay.style.pointerEvents = "none"
            }
          }
        },
        getDataURL: () => signaturePad.toDataURL("image/png"),
      }
    }
  })
}

// Initialize real-time validation with enhanced feedback
function initializeValidation() {
  const inputs = document.querySelectorAll(".modern-input")
  inputs.forEach((input) => {
    input.addEventListener("blur", () => validateField(input))
    input.addEventListener("input", () => {
      clearValidationError(input.id + "Error")
      if (input.value.trim() && validateField(input, true)) {
        input.style.borderColor = "var(--success)"
        input.style.boxShadow = "0 0 0 4px rgba(16, 185, 129, 0.1)"
      } else {
        input.style.borderColor = ""
        input.style.boxShadow = ""
      }
    })

    input.addEventListener("focus", () => {
      input.parentElement.style.transform = "translateY(-2px)"
    })

    input.addEventListener("blur", () => {
      input.parentElement.style.transform = ""
    })
  })

  const radioButtons = document.querySelectorAll('input[name="project"]')
  radioButtons.forEach((radio) => {
    radio.addEventListener("change", () => {
      clearValidationError("projectError")
      document.querySelectorAll(".radio-card").forEach((card) => {
        card.style.transform = ""
      })
      radio.closest(".radio-card").style.transform = "scale(1.02)"
      setTimeout(() => {
        radio.closest(".radio-card").style.transform = ""
      }, 200)
    })
  })
}

// Set current date
function setCurrentDate() {
  const today = new Date().toISOString().split("T")[0]
  const submitterDate = document.getElementById("submitterDate")
  const receiverDate = document.getElementById("receiverDate")

  if (submitterDate) submitterDate.value = today
  if (receiverDate) receiverDate.value = today
}

// Enhanced signature clearing with animation
function clearSignature(type) {
  const signaturePad = signaturePads[type]
  if (signaturePad) {
    signaturePad.clear()
  }
}

// Undo signature function
function undoSignature(type) {
  const signaturePad = signaturePads[type]
  if (signaturePad) {
    signaturePad.undo()
  }
}

// Enhanced field validation
function validateField(input, silent = false) {
  const value = input.value.trim()
  const fieldName = input.id
  const errorElementId = fieldName + "Error"

  if (!silent) {
    input.classList.remove("error", "success")
    clearValidationError(errorElementId)
  }

  if (input.hasAttribute("required") && !value) {
    if (!silent) {
      showValidationError(errorElementId, "This field is required")
      input.classList.add("error")
    }
    return false
  }

  switch (fieldName) {
    case "activity":
      if (value.length < 3) {
        if (!silent) {
          showValidationError(errorElementId, "Activity description must be at least 3 characters")
          input.classList.add("error")
        }
        return false
      }
      break

    case "amount":
      const amount = Number.parseFloat(value)
      if (isNaN(amount) || amount <= 0) {
        if (!silent) {
          showValidationError(errorElementId, "Please enter a valid amount greater than 0")
          input.classList.add("error")
        }
        return false
      }
      if (amount > 10000000) {
        if (!silent) {
          showValidationError(errorElementId, "Amount seems unusually high. Please verify.")
          input.classList.add("error")
        }
        return false
      }
      break

    case "prNumber":
      const prPattern = /^20\d{2}-\d{4}$/
      if (!prPattern.test(value)) {
        if (!silent) {
          showValidationError(errorElementId, "PR Number format should be YYYY-XXXX (e.g., 2025-0001)")
          input.classList.add("error")
        }
        return false
      }
      break

    case "submitterName":
    case "receiverName":
      if (value.length < 2) {
        if (!silent) {
          showValidationError(errorElementId, "Name must be at least 2 characters")
          input.classList.add("error")
        }
        return false
      }
      if (!/^[a-zA-Z\s.,-]+$/.test(value)) {
        if (!silent) {
          showValidationError(errorElementId, "Name can only contain letters, spaces, and common punctuation")
          input.classList.add("error")
        }
        return false
      }
      break

    case "submitterDate":
    case "receiverDate":
      const selectedDate = new Date(value)
      const today = new Date()
      const oneYearAgo = new Date()
      oneYearAgo.setFullYear(today.getFullYear() - 1)

      if (selectedDate > today) {
        if (!silent) {
          showValidationError(errorElementId, "Date cannot be in the future")
          input.classList.add("error")
        }
        return false
      }
      if (selectedDate < oneYearAgo) {
        if (!silent) {
          showValidationError(errorElementId, "Date cannot be more than a year ago")
          input.classList.add("error")
        }
        return false
      }
      break
  }

  if (value && !silent) {
    input.classList.add("success")
  }
  return true
}

function showValidationError(elementId, message) {
  const errorElement = document.getElementById(elementId)
  if (errorElement) {
    errorElement.textContent = message
    errorElement.classList.add("show")

    errorElement.style.animation = "shake 0.5s ease-in-out"
    setTimeout(() => {
      errorElement.style.animation = ""
    }, 500)
  }
}

function clearValidationError(elementId) {
  const errorElement = document.getElementById(elementId)
  if (errorElement) {
    errorElement.textContent = ""
    errorElement.classList.remove("show")
  }
}

// Enhanced navigation with smooth transitions
function nextStep() {
  if (validateCurrentStep()) {
    saveCurrentStepData()

    const currentStepElement = document.getElementById(`step${currentStep}`)
    currentStepElement.style.animation = "slideOut 0.3s ease-in-out"

    setTimeout(() => {
      currentStep++
      updateStepDisplay()
      updateProgressBar()

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      })

      const newStepElement = document.getElementById(`step${currentStep}`)
      newStepElement.style.animation = "slideIn 0.6s cubic-bezier(0.4, 0, 0.2, 1)"
    }, 300)
  }
}

function prevStep() {
  if (currentStep > 1) {
    const currentStepElement = document.getElementById(`step${currentStep}`)
    currentStepElement.style.animation = "slideOut 0.3s ease-in-out"

    setTimeout(() => {
      currentStep--
      updateStepDisplay()
      updateProgressBar()

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      })

      const newStepElement = document.getElementById(`step${currentStep}`)
      newStepElement.style.animation = "slideIn 0.6s cubic-bezier(0.4, 0, 0.2, 1)"
    }, 300)
  }
}

// Add CSS for slide animations
const style = document.createElement("style")
style.textContent = `
    @keyframes slideOut {
        from { opacity: 1; transform: translateX(0); }
        to { opacity: 0; transform: translateX(-30px); }
    }
    
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
    }
`
document.head.appendChild(style)

function updateStepDisplay() {
  document.querySelectorAll(".step-content").forEach((step) => {
    step.classList.remove("active")
  })

  const currentStepElement = document.getElementById(`step${currentStep}`)
  if (currentStepElement) {
    currentStepElement.classList.add("active")
  }
}

function updateProgressBar() {
  document.querySelectorAll(".step-item").forEach((step, index) => {
    const stepNumber = index + 1
    step.classList.remove("active", "completed")

    if (stepNumber < currentStep) {
      step.classList.add("completed")
    } else if (stepNumber === currentStep) {
      step.classList.add("active")
    }
  })

  const progressFill = document.querySelector(".progress-fill")
  const progressPercentage = ((currentStep - 1) / 3) * 100
  progressFill.style.width = `${progressPercentage}%`
}

// Comprehensive validation for each step
function validateCurrentStep() {
  switch (currentStep) {
    case 1:
      return validateStep1()
    case 2:
      return validateStep2()
    case 3:
      return validateStep3()
    default:
      return true
  }
}

function validateStep1() {
  let isValid = true

  const projectChecked = document.querySelector('input[name="project"]:checked')
  if (!projectChecked) {
    showValidationError("projectError", "Please select a project type")
    isValid = false
  }

  const requiredFields = ["activity", "amount", "prNumber"]
  requiredFields.forEach((fieldId) => {
    const field = document.getElementById(fieldId)
    if (!validateField(field)) {
      isValid = false
    }
  })

  return isValid
}

function validateStep2() {
  let isValid = true

  const requiredFields = ["submitterName", "submitterDate"]
  requiredFields.forEach((fieldId) => {
    const field = document.getElementById(fieldId)
    if (!validateField(field)) {
      isValid = false
    }
  })

  if (!signaturePads.submitter || signaturePads.submitter.isEmpty()) {
    showValidationError("submitterSignatureError", "Please provide your digital signature")
    isValid = false
  }

  return isValid
}

function validateStep3() {
  let isValid = true

  const requiredFields = ["receiverName", "receiverDate"]
  requiredFields.forEach((fieldId) => {
    const field = document.getElementById(fieldId)
    if (!validateField(field)) {
      isValid = false
    }
  })

  if (!signaturePads.receiver || signaturePads.receiver.isEmpty()) {
    showValidationError("receiverSignatureError", "Please provide the receiver's digital signature")
    isValid = false
  }

  return isValid
}

// Save current step data
function saveCurrentStepData() {
  switch (currentStep) {
    case 1:
      saveStep1Data()
      break
    case 2:
      saveStep2Data()
      break
    case 3:
      saveStep3Data()
      break
  }
}

function saveStep1Data() {
  const selectedProject = document.querySelector('input[name="project"]:checked')
  formData.projectType = selectedProject ? selectedProject.value : ""
  formData.activity = document.getElementById("activity").value
  formData.amount = document.getElementById("amount").value
  formData.prNumber = document.getElementById("prNumber").value
  formData.preRequirements = Array.from(document.querySelectorAll('input[name="preReq"]:checked')).map((cb) => cb.value)
  formData.postRequirements = Array.from(document.querySelectorAll('input[name="postReq"]:checked')).map(
    (cb) => cb.value,
  )
}

function saveStep2Data() {
  formData.submitter = {
    name: document.getElementById("submitterName").value,
    position: document.getElementById("submitterPosition").value || "Not specified",
    date: document.getElementById("submitterDate").value,
    signature: signaturePads.submitter ? signaturePads.submitter.getDataURL() : "",
  }
}

function saveStep3Data() {
  formData.receiver = {
    name: document.getElementById("receiverName").value,
    position: document.getElementById("receiverPosition").value || "Not specified",
    date: document.getElementById("receiverDate").value,
    signature: signaturePads.receiver ? signaturePads.receiver.getDataURL() : "",
  }
}

// Generate summary with enhanced presentation
function generateSummary() {
  if (validateCurrentStep()) {
    saveCurrentStepData()

    const currentStepElement = document.getElementById(`step${currentStep}`)
    currentStepElement.style.animation = "slideOut 0.3s ease-in-out"

    setTimeout(() => {
      currentStep = 4
      updateStepDisplay()
      updateProgressBar()
      displaySummary()

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      })

      const summaryElement = document.getElementById(`step${currentStep}`)
      summaryElement.style.animation = "slideIn 0.6s cubic-bezier(0.4, 0, 0.2, 1)"
    }, 300)
  }
}

function displaySummary() {
  const summaryContent = document.getElementById("summaryContent")
  const procurementNumber = `2025-${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`

  const html = `
        <div class="summary-section">
            <h3>📋 Project Information</h3>
            <div class="summary-item"><strong>Project Type:</strong> ${formData.projectType}</div>
            <div class="summary-item"><strong>Activity:</strong> ${formData.activity}</div>
            <div class="summary-item"><strong>Amount:</strong> ₱${Number.parseFloat(formData.amount).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</div>
            <div class="summary-item"><strong>PR Number:</strong> ${formData.prNumber}</div>
            <div class="summary-item"><strong>Procurement Number:</strong> ${procurementNumber}</div>
        </div>
        
        <div class="summary-section">
            <h3>📝 Pre-Procurement Requirements</h3>
            ${
              formData.preRequirements.length > 0
                ? formData.preRequirements.map((req) => `<div class="summary-item">✅ ${req}</div>`).join("")
                : '<div class="summary-item">❌ No pre-procurement requirements selected</div>'
            }
        </div>
        
        <div class="summary-section">
            <h3>📋 Post-Procurement Requirements</h3>
            ${
              formData.postRequirements.length > 0
                ? formData.postRequirements.map((req) => `<div class="summary-item">✅ ${req}</div>`).join("")
                : '<div class="summary-item">❌ No post-procurement requirements selected</div>'
            }
        </div>
        
        <div class="summary-section">
            <h3>✍️ Submitted By</h3>
            <div class="summary-item"><strong>Name:</strong> ${formData.submitter.name}</div>
            <div class="summary-item"><strong>Position:</strong> ${formData.submitter.position}</div>
            <div class="summary-item"><strong>Date:</strong> ${new Date(formData.submitter.date).toLocaleDateString("en-PH")}</div>
            <div class="summary-item">
                <strong>Signature:</strong><br>
                <img src="${formData.submitter.signature}" alt="Submitter Signature" class="signature-preview">
            </div>
        </div>
        
        <div class="summary-section">
            <h3>👤 Received By</h3>
            <div class="summary-item"><strong>Name:</strong> ${formData.receiver.name}</div>
            <div class="summary-item"><strong>Position:</strong> ${formData.receiver.position}</div>
            <div class="summary-item"><strong>Date:</strong> ${new Date(formData.receiver.date).toLocaleDateString("en-PH")}</div>
            <div class="summary-item">
                <strong>Signature:</strong><br>
                <img src="${formData.receiver.signature}" alt="Receiver Signature" class="signature-preview">
            </div>
        </div>
        
        <div class="summary-section">
            <h3>📄 Document Information</h3>
            <div class="summary-item"><strong>Generated On:</strong> ${new Date().toLocaleString("en-PH")}</div>
            <div class="summary-item"><strong>Status:</strong> <span style="color: var(--success); font-weight: 600;">✅ Ready for Download</span></div>
        </div>
    `

  summaryContent.innerHTML = html
  formData.procurementNumber = procurementNumber

  // Add stagger animation to summary sections
  const sections = summaryContent.querySelectorAll(".summary-section")
  sections.forEach((section, index) => {
    section.style.opacity = "0"
    section.style.transform = "translateY(20px)"
    setTimeout(() => {
      section.style.transition = "all 0.5s ease"
      section.style.opacity = "1"
      section.style.transform = "translateY(0)"
    }, index * 100)
  })
}

// Enhanced PDF generation
function downloadPDF() {
  const downloadBtn = event.target
  const originalText = downloadBtn.innerHTML
  downloadBtn.innerHTML = '<div class="btn-icon">⏳</div><span class="btn-text">Generating...</span>'
  downloadBtn.disabled = true

  setTimeout(() => {
    const printWindow = window.open("", "_blank")
    const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>ILCDB Procurement Document - ${formData.procurementNumber}</title>
                <style>
                    @page {
                        size: A4;
                        margin: 15mm;
                    }
                    
                    body {
                        font-family: 'Arial', sans-serif;
                        font-size: 11px;
                        line-height: 1.3;
                        margin: 0;
                        color: #1e293b;
                    }
                    
                    .header {
                        text-align: center;
                        margin-bottom: 15px;
                        padding-bottom: 10px;
                        border-bottom: 2px solid #0038a8;
                    }
                    
                    .logo-section {
                        display: flex;
                        justify-content: center;
                        gap: 15px;
                        margin-bottom: 10px;
                    }
                    
                    .logo-placeholder {
                        background: #0038a8;
                        color: white;
                        padding: 5px 15px;
                        border-radius: 4px;
                        font-weight: bold;
                        font-size: 10px;
                    }
                    
                    .header h1 {
                        font-size: 16px;
                        margin: 5px 0;
                        color: #0038a8;
                    }
                    
                    .header p {
                        font-size: 10px;
                        color: #64748b;
                        margin: 0;
                    }
                    
                    .document-info {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 15px;
                        font-size: 10px;
                        background: #f8fafc;
                        padding: 8px;
                        border-radius: 4px;
                    }
                    
                    .content-grid {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 15px;
                        margin-bottom: 15px;
                    }
                    
                    .summary-section {
                        margin-bottom: 12px;
                        padding: 10px;
                        border: 1px solid #e2e8f0;
                        border-radius: 4px;
                        background: #f8fafc;
                        break-inside: avoid;
                    }
                    
                    .summary-section h3 {
                        color: #0038a8;
                        margin: 0 0 8px 0;
                        font-size: 12px;
                        font-weight: bold;
                        border-bottom: 1px solid #e2e8f0;
                        padding-bottom: 4px;
                    }
                    
                    .summary-item {
                        margin: 4px 0;
                        padding: 3px 0;
                        font-size: 10px;
                        line-height: 1.2;
                    }
                    
                    .summary-item strong {
                        color: #1e293b;
                        font-weight: 600;
                    }
                    
                    .signature-preview {
                        max-width: 80px;
                        max-height: 30px;
                        border: 1px solid #e2e8f0;
                        border-radius: 2px;
                        margin-top: 3px;
                    }
                    
                    .signatures-row {
                        display: flex;
                        justify-content: space-between;
                        gap: 20px;
                        margin-top: 15px;
                    }
                    
                    .signature-box {
                        flex: 1;
                        text-align: center;
                        padding: 10px;
                        border: 1px solid #e2e8f0;
                        border-radius: 4px;
                        background: white;
                    }
                    
                    .requirements-grid {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 10px;
                        font-size: 9px;
                    }
                    
                    .req-column {
                        padding: 8px;
                        background: white;
                        border: 1px solid #e2e8f0;
                        border-radius: 4px;
                    }
                    
                    .req-column h4 {
                        margin: 0 0 6px 0;
                        font-size: 10px;
                        color: #ce1126;
                        font-weight: bold;
                    }
                    
                    .req-item {
                        margin: 2px 0;
                        font-size: 9px;
                    }
                    
                    @media print {
                        body { margin: 0; }
                        .summary-section { page-break-inside: avoid; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="logo-section">
                        <div class="logo-placeholder">ILCDB</div>
                        <div class="logo-placeholder">DTC</div>
                        <div class="logo-placeholder">SPARK</div>
                    </div>
                    <h1>Digital Procurement Document</h1>
                    <p>ICT Literacy and Competency Development Bureau</p>
                </div>
                
                <div class="document-info">
                    <div><strong>Procurement No:</strong> ${formData.procurementNumber}</div>
                    <div><strong>Generated:</strong> ${new Date().toLocaleDateString("en-PH")}</div>
                    <div><strong>Project:</strong> ${formData.projectType}</div>
                </div>
                
                <div class="content-grid">
                    <div class="summary-section">
                        <h3>📋 Project Details</h3>
                        <div class="summary-item"><strong>Type:</strong> ${formData.projectType}</div>
                        <div class="summary-item"><strong>Activity:</strong> ${formData.activity}</div>
                        <div class="summary-item"><strong>Amount:</strong> ₱${Number.parseFloat(formData.amount).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</div>
                        <div class="summary-item"><strong>PR Number:</strong> ${formData.prNumber}</div>
                    </div>
                    
                    <div class="summary-section">
                        <h3>📄 Document Status</h3>
                        <div class="summary-item"><strong>Status:</strong> Approved</div>
                        <div class="summary-item"><strong>Generated:</strong> ${new Date().toLocaleDateString("en-PH")}</div>
                        <div class="summary-item"><strong>Total Requirements:</strong> ${formData.preRequirements.length + formData.postRequirements.length}</div>
                    </div>
                </div>
                
                <div class="requirements-grid">
                    <div class="req-column">
                        <h4>Pre-Procurement Requirements</h4>
                        ${
                          formData.preRequirements.length > 0
                            ? formData.preRequirements.map((req) => `<div class="req-item">✓ ${req}</div>`).join("")
                            : '<div class="req-item">No requirements selected</div>'
                        }
                    </div>
                    
                    <div class="req-column">
                        <h4>Post-Procurement Requirements</h4>
                        ${
                          formData.postRequirements.length > 0
                            ? formData.postRequirements.map((req) => `<div class="req-item">✓ ${req}</div>`).join("")
                            : '<div class="req-item">No requirements selected</div>'
                        }
                    </div>
                </div>
                
                <div class="signatures-row">
                    <div class="signature-box">
                        <div style="font-weight: bold; margin-bottom: 5px;">Submitted By</div>
                        <img src="${formData.submitter.signature}" alt="Submitter Signature" class="signature-preview">
                        <div style="margin-top: 5px; font-size: 9px;">
                            <div><strong>${formData.submitter.name}</strong></div>
                            <div>${formData.submitter.position}</div>
                            <div>Date: ${new Date(formData.submitter.date).toLocaleDateString("en-PH")}</div>
                        </div>
                    </div>
                    
                    <div class="signature-box">
                        <div style="font-weight: bold; margin-bottom: 5px;">Received By</div>
                        <img src="${formData.receiver.signature}" alt="Receiver Signature" class="signature-preview">
                        <div style="margin-top: 5px; font-size: 9px;">
                            <div><strong>${formData.receiver.name}</strong></div>
                            <div>${formData.receiver.position}</div>
                            <div>Date: ${new Date(formData.receiver.date).toLocaleDateString("en-PH")}</div>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `

    printWindow.document.write(printContent)
    printWindow.document.close()

    setTimeout(() => {
      printWindow.print()
      downloadBtn.innerHTML = originalText
      downloadBtn.disabled = false
    }, 1000)
  }, 1000)
}

// Enhanced start over function
function startOver() {
  if (confirm("Are you sure you want to start over? All data will be lost.")) {
    const currentCard = document.querySelector(".glass-card")
    currentCard.style.animation = "fadeOut 0.5s ease-in-out"

    setTimeout(() => {
      formData = {}
      currentStep = 1

      document.querySelectorAll("input").forEach((input) => {
        if (input.type === "checkbox" || input.type === "radio") {
          input.checked = false
        } else {
          input.value = ""
        }
        input.classList.remove("error", "success")
        input.style.borderColor = ""
        input.style.boxShadow = ""
      })

      document.querySelectorAll(".error-message").forEach((error) => {
        error.textContent = ""
        error.classList.remove("show")
      })

      // Clear signatures using the new signature pad API
      Object.keys(signaturePads).forEach((type) => {
        if (signaturePads[type]) {
          signaturePads[type].clear()
        }
      })

      setCurrentDate()
      updateStepDisplay()
      updateProgressBar()

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      })

      setTimeout(() => {
        const newCard = document.querySelector(".glass-card")
        newCard.style.animation = "fadeIn 0.5s ease-in-out"
      }, 100)
    }, 500)
  }
}

// Add fade animations
const fadeStyle = document.createElement("style")
fadeStyle.textContent = `
    @keyframes fadeOut {
        from { opacity: 1; transform: scale(1); }
        to { opacity: 0; transform: scale(0.95); }
    }
    
    @keyframes fadeIn {
        from { opacity: 0; transform: scale(0.95); }
        to { opacity: 1; transform: scale(1); }
    }
`
document.head.appendChild(fadeStyle)
