// Application State
let currentProcurement = null
let currentPhase = 1
const procurements = JSON.parse(localStorage.getItem("procurements")) || []

// Add at the top after the existing variables
const PR_NUMBER_REGEX = /^\d{4}-\d{2}-\d{2}$/

// Phase configurations based on the ILCDB document
const phaseConfigs = {
  1: {
    title: "Pre-Procurement Phase 1: Initial Requirements",
    unit: "Supply Unit/Assigned Personnel",
    checklist: [
      "APP/PPMP (Annual Procurement Plan/Project Procurement Management Plan)",
      "SARO (Special Allotment Release Order)",
      "Budget Breakdown",
      "Distribution List (for items/goods)",
      "POI/Activity Design (Program of Implementation)",
      "Market Research",
    ],
    remarks: "Request for Abstract, Philgeps posting (if applicable)",
  },
  2: {
    title: "Pre-Procurement Phase 2: Purchase Processing",
    unit: "Supply Unit",
    checklist: [
      "Purchase Request",
      "Quotations",
      "Purchase Order",
      "Abstract/Philgeps posting*",
      "ORS (Obligation Request and Status)",
    ],
    remarks: "For ORS creation",
  },
  3: {
    title: "Pre-Procurement Phase 3: Budget Processing",
    unit: "Budget Unit",
    checklist: [
      "Purchase Request verification",
      "Quotations review",
      "APP/PPMP confirmation",
      "SARO validation",
      "Budget Breakdown approval",
    ],
    remarks: "For obligation",
  },
  4: {
    title: "Post-Procurement Phase 1: Delivery & Inspection",
    unit: "Supply Unit",
    checklist: [
      "Delivery Receipt",
      "Distribution List (Receiving Copy)",
      "IAR (Inspection and Acceptance Report)",
      "ICS/PAR (Inventory Custodian Slip/Property Acknowledgment Receipt)",
      "Request for Inspection (COA)",
    ],
    remarks: "For IAR/PAR/ICS/RFI creation",
  },
  5: {
    title: "Post-Procurement Phase 2: Documentation",
    unit: "Supply Unit",
    checklist: [
      "Attendance (if applicable)",
      "Certificate of Completion/Satisfaction for Supplier",
      "Photos (documentation)",
      "SOA/Billing Statement",
      "DV (Disbursement Voucher) preparation",
    ],
    remarks: "For DV creation",
  },
  6: {
    title: "Post-Procurement Phase 3: Payment Processing",
    unit: "Accounting Unit",
    checklist: [
      "DV (Disbursement Voucher) review",
      "Supporting documents verification",
      "Payment authorization",
      "Final documentation",
      "Process completion",
    ],
    remarks: "For payment processing",
  },
}

// Import SignaturePad library
const SignaturePad = window.SignaturePad

// Initialize signature pads
const signaturePads = {}

// DOM Elements
const pages = {
  landing: document.getElementById("landing-page"),
  newForm: document.getElementById("new-procurement-form"),
  preProc: document.getElementById("pre-procurement"),
  progress: document.getElementById("progress-view"),
}

// Initialize the application
document.addEventListener("DOMContentLoaded", () => {
  initializeEventListeners()
  initializeSignaturePads()
  showPage("landing")
})

function initializeEventListeners() {
  // Landing page events
  document.getElementById("search-input").addEventListener("input", handleSearch)
  document.getElementById("create-new-btn").addEventListener("click", () => showPage("newForm"))

  // New procurement form events
  document.getElementById("procurement-form").addEventListener("submit", handleNewProcurement)
  document.getElementById("back-to-landing").addEventListener("click", () => showPage("landing"))
  document.getElementById("pr-number").addEventListener("blur", checkPRDuplicate)

  // Phase navigation events
  document.getElementById("back-to-landing-phase").addEventListener("click", () => showPage("landing"))
  document.getElementById("view-progress").addEventListener("click", () => showProgressView())
  document.getElementById("continue-phase").addEventListener("click", continueToNextPhase)

  // Progress view events
  document.getElementById("back-from-progress").addEventListener("click", () => showPage("preProc"))
  document.getElementById("download-pdf").addEventListener("click", downloadPDF)
}

function initializeSignaturePads() {
  const canvases = ["submitted-signature", "received-signature"]
  canvases.forEach((canvasId) => {
    const canvas = document.getElementById(canvasId)
    if (canvas) {
      // Ensure canvas is visible and properly sized
      canvas.style.display = "block"
      canvas.style.background = "white"
      canvas.style.border = "2px solid #e0e0e0"
      canvas.style.borderRadius = "0.5rem"
      canvas.style.width = "100%"
      canvas.style.maxWidth = "250px"
      canvas.style.height = "80px"
      canvas.style.margin = "0.5rem 0"

      // Set canvas dimensions
      canvas.width = 250
      canvas.height = 80

      // Initialize SignaturePad with proper settings
      const signaturePad = new SignaturePad(canvas, {
        backgroundColor: "rgb(255, 255, 255)", // Solid white background
        penColor: "rgb(0, 0, 0)", // Black pen
        velocityFilterWeight: 0.7,
        minWidth: 1,
        maxWidth: 3,
        throttle: 16,
        minPointDistance: 2,
      })

      // Store the SignaturePad instance
      signaturePads[canvasId] = {
        canvas: canvas,
        pad: signaturePad,
      }

      // Update signature status when drawing
      signaturePad.addEventListener("endStroke", () => {
        updateSignatureStatus()
      })

      // Force a redraw to ensure visibility
      signaturePad.clear()

      console.log(`Signature pad initialized for ${canvasId}`, canvas, signaturePad)
    } else {
      console.error(`Canvas element not found: ${canvasId}`)
    }
  })
}

// Remove the old drawing functions - they're no longer needed

function clearSignature(canvasId) {
  const padData = signaturePads[canvasId]
  if (padData && padData.pad) {
    padData.pad.clear()
    updateSignatureStatus()
  }
}

function isSignatureEmpty(canvasId) {
  const padData = signaturePads[canvasId]
  if (padData && padData.pad) {
    return padData.pad.isEmpty()
  }
  return true
}

function validatePhaseCompletion() {
  const errors = []
  const validationDiv = document.getElementById("phase-validation")
  const validationList = document.getElementById("validation-list")

  // Clear previous validation states
  document.querySelectorAll(".signature-section").forEach((section) => {
    section.classList.remove("error")
  })

  // Check submitted by section
  const submittedName = document.getElementById("submitted-by-name").value.trim()
  const submittedDate = document.getElementById("submitted-date").value
  const submittedSignatureEmpty = isSignatureEmpty("submitted-signature")

  if (!submittedName) {
    errors.push("Submitted by name is required")
    document.getElementById("submitted-section").classList.add("error")
  }

  if (!submittedDate) {
    errors.push("Submitted by date is required")
    document.getElementById("submitted-section").classList.add("error")
  }

  if (submittedSignatureEmpty) {
    errors.push("Submitted by signature is required")
    document.getElementById("submitted-section").classList.add("error")
  }

  // Check received by section
  const receivedName = document.getElementById("received-by-name").value.trim()
  const receivedDate = document.getElementById("received-date").value
  const receivedSignatureEmpty = isSignatureEmpty("received-signature")

  if (!receivedName) {
    errors.push("Received by name is required")
    document.getElementById("received-section").classList.add("error")
  }

  if (!receivedDate) {
    errors.push("Received by date is required")
    document.getElementById("received-section").classList.add("error")
  }

  if (receivedSignatureEmpty) {
    errors.push("Received by signature is required")
    document.getElementById("received-section").classList.add("error")
  }

  // Display validation messages
  if (errors.length > 0) {
    validationList.innerHTML = errors.map((error) => `<li>${error}</li>`).join("")
    validationDiv.classList.add("show")
    validationDiv.scrollIntoView({ behavior: "smooth", block: "nearest" })
    return false
  } else {
    validationDiv.classList.remove("show")
    return true
  }
}

function updateSignatureStatus() {
  // Update visual status of signature sections
  const submittedSection = document.getElementById("submitted-section")
  const receivedSection = document.getElementById("received-section")

  if (!isSignatureEmpty("submitted-signature")) {
    submittedSection.classList.add("has-signature")
  } else {
    submittedSection.classList.remove("has-signature")
  }

  if (!isSignatureEmpty("received-signature")) {
    receivedSection.classList.add("has-signature")
  } else {
    receivedSection.classList.remove("has-signature")
  }
}

function showPage(pageId) {
  Object.values(pages).forEach((page) => page.classList.remove("active"))
  pages[pageId].classList.add("active")
}

function handleSearch(e) {
  const query = e.target.value.toLowerCase()
  const resultsContainer = document.getElementById("search-results")

  if (query.length < 2) {
    resultsContainer.style.display = "none"
    return
  }

  const matches = procurements.filter(
    (proc) => proc.prNumber.toLowerCase().includes(query) || proc.title.toLowerCase().includes(query),
  )

  if (matches.length > 0) {
    resultsContainer.innerHTML = matches
      .map(
        (proc) =>
          `<div class="search-result-item" onclick="selectProcurement('${proc.id}')">
                <strong>${proc.prNumber}</strong> - ${proc.title}
                <br><small>Phase ${proc.currentPhase} of 6</small>
            </div>`,
      )
      .join("")
    resultsContainer.style.display = "block"
  } else {
    resultsContainer.innerHTML = '<div class="search-result-item">No matches found</div>'
    resultsContainer.style.display = "block"
  }
}

function selectProcurement(procId) {
  currentProcurement = procurements.find((p) => p.id === procId)
  currentPhase = currentProcurement.currentPhase
  document.getElementById("search-results").style.display = "none"
  document.getElementById("search-input").value = ""
  loadPhase()
  showPage("preProc")
}

function checkPRDuplicate() {
  const prNumber = document.getElementById("pr-number").value.trim()
  const errorDiv = document.getElementById("pr-error")

  // Clear previous errors
  errorDiv.textContent = ""
  document.getElementById("pr-number").classList.remove("error")

  if (!prNumber) {
    return false
  }

  // Check format
  if (!PR_NUMBER_REGEX.test(prNumber)) {
    errorDiv.textContent = "Invalid format. Use YYYY-NN-NN (e.g., 2025-01-01)"
    document.getElementById("pr-number").classList.add("error")
    return false
  }

  // Check for duplicates
  if (procurements.some((p) => p.prNumber === prNumber)) {
    errorDiv.textContent = "PR Number already exists. Please use a different number."
    document.getElementById("pr-number").classList.add("error")
    return false
  }

  return true
}

function validateForm() {
  const errors = []
  const messagesDiv = document.getElementById("validation-messages")

  // Clear previous validation states
  document.querySelectorAll(".error").forEach((el) => el.classList.remove("error"))

  // Activity title validation
  const title = document.getElementById("activity-title").value.trim()
  if (!title) {
    errors.push("Activity/Procurement title is required")
    document.getElementById("activity-title").classList.add("error")
  } else if (title.length < 5) {
    errors.push("Activity/Procurement title must be at least 5 characters long")
    document.getElementById("activity-title").classList.add("error")
  }

  // Amount validation
  const amount = document.getElementById("amount").value
  if (!amount || Number.parseFloat(amount) <= 0) {
    errors.push("Amount must be greater than 0")
    document.getElementById("amount").classList.add("error")
  } else if (Number.parseFloat(amount) > 10000000) {
    errors.push("Amount seems unusually high. Please verify.")
  }

  // PR number validation
  if (!checkPRDuplicate()) {
    errors.push("Please fix the PR number format or choose a unique number")
  }

  // Project type validation
  const projectType = document.querySelector('input[name="project-type"]:checked')
  if (!projectType) {
    errors.push("Please select a project type")
  }

  // Display validation messages
  if (errors.length > 0) {
    messagesDiv.innerHTML = `
      <h4 style="margin-bottom: 0.5rem;">Please fix the following errors:</h4>
      <ul>${errors.map((error) => `<li>${error}</li>`).join("")}</ul>
    `
    messagesDiv.classList.add("show")
    messagesDiv.scrollIntoView({ behavior: "smooth", block: "nearest" })
    return false
  } else {
    messagesDiv.classList.remove("show")
    return true
  }
}

function handleNewProcurement(e) {
  e.preventDefault()

  if (!validateForm()) {
    return
  }

  const formData = new FormData(e.target)
  const newProcurement = {
    id: Date.now().toString(),
    title: document.getElementById("activity-title").value.trim(),
    amount: Number.parseFloat(document.getElementById("amount").value),
    prNumber: document.getElementById("pr-number").value.trim(),
    projectType: formData.get("project-type"),
    currentPhase: 1,
    phases: {},
    createdAt: new Date().toISOString(),
  }

  procurements.push(newProcurement)
  localStorage.setItem("procurements", JSON.stringify(procurements))

  currentProcurement = newProcurement
  currentPhase = 1

  // Reset form and validation
  e.target.reset()
  document.getElementById("validation-messages").classList.remove("show")

  loadPhase()
  showPage("preProc")
}

function loadPhase() {
  const config = phaseConfigs[currentPhase]

  // Update phase title and progress
  document.getElementById("phase-title").textContent = config.title
  document.getElementById("progress-text").textContent = `Phase ${currentPhase} of 6`
  document.getElementById("progress-fill").style.width = `${(currentPhase / 6) * 100}%`

  // Load checklist
  const checklistContainer = document.getElementById("checklist")
  checklistContainer.innerHTML = config.checklist
    .map(
      (item, index) =>
        `<div class="checklist-item">
            <input type="checkbox" id="check-${index}" ${isChecklistItemCompleted(currentPhase, index) ? "checked" : ""}>
            <label for="check-${index}">${item}</label>
        </div>`,
    )
    .join("")

  // Add event listeners to checkboxes
  config.checklist.forEach((_, index) => {
    document.getElementById(`check-${index}`).addEventListener("change", (e) => {
      saveChecklistState(currentPhase, index, e.target.checked)
    })
  })

  // Load saved phase data
  loadPhaseData()

  // Set default remarks
  document.getElementById("received-remarks").value = config.remarks

  // Set today's date as default
  const today = new Date().toISOString().split("T")[0]
  document.getElementById("submitted-date").value = today
  document.getElementById("received-date").value = today
}

function isChecklistItemCompleted(phase, itemIndex) {
  return currentProcurement.phases[phase]?.checklist?.[itemIndex] || false
}

function saveChecklistState(phase, itemIndex, checked) {
  if (!currentProcurement.phases[phase]) {
    currentProcurement.phases[phase] = { checklist: {} }
  }
  if (!currentProcurement.phases[phase].checklist) {
    currentProcurement.phases[phase].checklist = {}
  }

  currentProcurement.phases[phase].checklist[itemIndex] = checked
  saveProcurement()
}

function loadPhaseData() {
  const phaseData = currentProcurement.phases[currentPhase]
  if (!phaseData) return

  // Load form data
  if (phaseData.submittedBy) {
    document.getElementById("submitted-by-name").value = phaseData.submittedBy.name || ""
    document.getElementById("submitted-date").value = phaseData.submittedBy.date || ""
    document.getElementById("submitted-remarks").value = phaseData.submittedBy.remarks || ""
  }

  if (phaseData.receivedBy) {
    document.getElementById("received-by-name").value = phaseData.receivedBy.name || ""
    document.getElementById("received-date").value = phaseData.receivedBy.date || ""
    document.getElementById("received-remarks").value = phaseData.receivedBy.remarks || ""
  }

  // Load signatures
  if (phaseData.signatures) {
    if (phaseData.signatures.submitted) {
      loadSignature("submitted-signature", phaseData.signatures.submitted)
    }
    if (phaseData.signatures.received) {
      loadSignature("received-signature", phaseData.signatures.received)
    }
  }

  // Update signature status after loading
  setTimeout(() => {
    updateSignatureStatus()
  }, 100)
}

function loadSignature(canvasId, signatureData) {
  const padData = signaturePads[canvasId]
  if (padData && padData.pad && signatureData) {
    try {
      padData.pad.fromDataURL(signatureData)
      updateSignatureStatus()
    } catch (error) {
      console.error("Error loading signature:", error)
    }
  }
}

function savePhaseData() {
  if (!currentProcurement.phases[currentPhase]) {
    currentProcurement.phases[currentPhase] = {}
  }

  const phaseData = currentProcurement.phases[currentPhase]

  // Save form data
  phaseData.submittedBy = {
    name: document.getElementById("submitted-by-name").value,
    date: document.getElementById("submitted-date").value,
    remarks: document.getElementById("submitted-remarks").value,
  }

  phaseData.receivedBy = {
    name: document.getElementById("received-by-name").value,
    date: document.getElementById("received-date").value,
    remarks: document.getElementById("received-remarks").value,
  }

  // Save signatures using SignaturePad's toDataURL method
  const submittedPad = signaturePads["submitted-signature"]
  const receivedPad = signaturePads["received-signature"]

  phaseData.signatures = {
    submitted:
      submittedPad && submittedPad.pad && !submittedPad.pad.isEmpty() ? submittedPad.pad.toDataURL("image/png") : null,
    received:
      receivedPad && receivedPad.pad && !receivedPad.pad.isEmpty() ? receivedPad.pad.toDataURL("image/png") : null,
  }

  phaseData.completedAt = new Date().toISOString()

  saveProcurement()
}

function continueToNextPhase() {
  // Validate phase completion
  if (!validatePhaseCompletion()) {
    return
  }

  // Save current phase data
  savePhaseData()

  if (currentPhase < 6) {
    currentPhase++
    currentProcurement.currentPhase = currentPhase

    // Clear signature pads for new phase using SignaturePad's clear method
    clearSignature("submitted-signature")
    clearSignature("received-signature")

    // Clear validation messages
    document.getElementById("phase-validation").classList.remove("show")

    loadPhase()
  } else {
    // Procurement completed - show completion modal
    showCompletionModal()
  }
}

function showCompletionModal() {
  // Update completion modal content
  document.getElementById("completion-title").textContent = currentProcurement.title
  document.getElementById("completion-pr-number").textContent = currentProcurement.prNumber
  document.getElementById("completion-amount").textContent = `₱${currentProcurement.amount.toLocaleString()}`
  document.getElementById("completion-project-type").textContent = currentProcurement.projectType
  document.getElementById("completion-date").textContent = new Date().toLocaleDateString()

  // Show the modal
  document.getElementById("completion-modal").classList.add("show")

  // Add event listeners for completion modal buttons
  document.getElementById("completion-view-progress").onclick = () => {
    hideCompletionModal()
    showProgressView()
  }

  document.getElementById("completion-download-pdf").onclick = () => {
    downloadPDF()
  }

  document.getElementById("completion-close").onclick = () => {
    hideCompletionModal()
    showPage("landing")
  }

  // Close modal when clicking outside
  document.getElementById("completion-modal").onclick = (e) => {
    if (e.target.id === "completion-modal") {
      hideCompletionModal()
      showPage("landing")
    }
  }
}

function hideCompletionModal() {
  document.getElementById("completion-modal").classList.remove("show")
}

function saveProcurement() {
  const index = procurements.findIndex((p) => p.id === currentProcurement.id)
  if (index !== -1) {
    procurements[index] = currentProcurement
    localStorage.setItem("procurements", JSON.stringify(procurements))
  }
}

function showProgressView() {
  const progressContainer = document.getElementById("progress-details")

  let html = `
    <div class="procurement-header">
      <h3>${currentProcurement.title}</h3>
      <p><strong>PR Number:</strong> ${currentProcurement.prNumber}</p>
      <p><strong>Amount:</strong> ₱${currentProcurement.amount.toLocaleString()}</p>
      <p><strong>Project Type:</strong> ${currentProcurement.projectType}</p>
      <p><strong>Created:</strong> ${new Date(currentProcurement.createdAt).toLocaleDateString()}</p>
    </div>
  `

  for (let phase = 1; phase <= 6; phase++) {
    const config = phaseConfigs[phase]
    const phaseData = currentProcurement.phases[phase]
    const isCompleted = phaseData && phaseData.completedAt
    const isCurrent = phase === currentPhase && !isCompleted

    html += `
      <div class="progress-phase ${isCompleted ? "completed" : ""} ${isCurrent ? "current" : ""}">
        <h4>${config.title} ${isCompleted ? "✓" : isCurrent ? "(Current)" : ""}</h4>
        <p><strong>Responsible Unit:</strong> ${config.unit}</p>
        
        <div class="checklist-progress">
          <h5>Requirements Checklist:</h5>
          <ul>
            ${config.checklist
              .map((item, index) => {
                const isChecked = phaseData?.checklist?.[index] || false
                return `<li class="${isChecked ? "completed" : ""}">${item}</li>`
              })
              .join("")}
          </ul>
        </div>
        
        ${
          phaseData
            ? `
          <div class="phase-details">
            <p><strong>Submitted by:</strong> ${phaseData.submittedBy?.name || "Not completed"} ${phaseData.submittedBy?.date ? `(${new Date(phaseData.submittedBy.date).toLocaleDateString()})` : ""}</p>
            <p><strong>Received by:</strong> ${phaseData.receivedBy?.name || "Not completed"} ${phaseData.receivedBy?.date ? `(${new Date(phaseData.receivedBy.date).toLocaleDateString()})` : ""}</p>
            ${phaseData.submittedBy?.remarks ? `<p><strong>Submitted Remarks:</strong> ${phaseData.submittedBy.remarks}</p>` : ""}
            ${phaseData.receivedBy?.remarks ? `<p><strong>Received Remarks:</strong> ${phaseData.receivedBy.remarks}</p>` : ""}
            ${isCompleted ? `<p><strong>Completed:</strong> ${new Date(phaseData.completedAt).toLocaleDateString()}</p>` : ""}
          </div>
          
          <div class="signature-preview">
            <h5>Digital Signatures:</h5>
            <div class="signature-grid">
              <div class="signature-item">
                <h6>Submitted By</h6>
                ${
                  phaseData.signatures?.submitted &&
                  phaseData.signatures.submitted !==
                    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
                    ? `<img src="${phaseData.signatures.submitted}" alt="Submitted Signature" class="signature-image">`
                    : '<div class="signature-placeholder">No signature</div>'
                }
              </div>
              <div class="signature-item">
                <h6>Received By</h6>
                ${
                  phaseData.signatures?.received &&
                  phaseData.signatures.received !==
                    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
                    ? `<img src="${phaseData.signatures.received}" alt="Received Signature" class="signature-image">`
                    : '<div class="signature-placeholder">No signature</div>'
                }
              </div>
            </div>
          </div>
        `
            : "<p>Not started</p>"
        }
      </div>
    `
  }

  progressContainer.innerHTML = html
  showPage("progress")
}

function downloadPDF() {
  const printWindow = window.open("", "_blank")
  const progressContainer = document.getElementById("progress-details")

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Procurement Summary - ${currentProcurement.prNumber}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body { 
          font-family: 'Arial', sans-serif; 
          margin: 0;
          padding: 20px;
          line-height: 1.5;
          color: #333;
          background: white;
          font-size: 12px;
        }
        
        .document-header { 
          text-align: center; 
          margin-bottom: 30px; 
          padding-bottom: 20px;
          border-bottom: 2px solid #333;
        }
        
        .document-header h1 {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 5px;
          color: #333;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .document-header h2 {
          font-size: 14px;
          font-weight: normal;
          margin-bottom: 10px;
          color: #666;
        }
        
        .document-header .meta {
          font-size: 10px;
          color: #888;
          margin-top: 10px;
        }
        
        .procurement-summary {
          background: #f9f9f9;
          padding: 15px;
          margin-bottom: 25px;
          border: 1px solid #ddd;
        }
        
        .procurement-summary h3 {
          font-size: 14px;
          font-weight: bold;
          margin-bottom: 10px;
          color: #333;
          text-transform: uppercase;
        }
        
        .summary-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        
        .summary-item {
          margin-bottom: 5px;
        }
        
        .summary-item strong {
          font-weight: bold;
          color: #333;
        }
        
        .phase-section { 
          margin-bottom: 25px; 
          padding: 15px; 
          border: 1px solid #ddd;
          page-break-inside: avoid;
          background: white;
        }
        
        .phase-section.completed { 
          background: #f8f8f8;
          border-left: 4px solid #333;
        }
        
        .phase-section.current { 
          background: #f5f5f5;
          border-left: 4px solid #666;
        }
        
        .phase-title {
          font-size: 13px;
          font-weight: bold;
          margin-bottom: 10px;
          color: #333;
          text-transform: uppercase;
          padding-bottom: 5px;
          border-bottom: 1px solid #eee;
        }
        
        .phase-meta {
          font-size: 11px;
          color: #666;
          margin-bottom: 10px;
        }
        
        .requirements-section {
          margin: 15px 0;
        }
        
        .requirements-title {
          font-size: 11px;
          font-weight: bold;
          color: #333;
          margin-bottom: 8px;
          text-transform: uppercase;
        }
        
        .requirements-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        
        .requirements-list li {
          padding: 3px 0;
          font-size: 11px;
          border-bottom: 1px dotted #eee;
          display: flex;
          align-items: center;
        }
        
        .requirements-list li:last-child {
          border-bottom: none;
        }
        
        .requirements-list li.completed {
          font-weight: bold;
        }
        
        .requirements-list li::before {
          content: '☐';
          margin-right: 8px;
          color: #ccc;
        }
        
        .requirements-list li.completed::before {
          content: '☑';
          color: #333;
        }
        
        .phase-details {
          margin-top: 15px;
          padding: 10px;
          background: #fafafa;
          border: 1px solid #eee;
        }
        
        .detail-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin-bottom: 8px;
        }
        
        .detail-item {
          font-size: 11px;
        }
        
        .detail-item strong {
          font-weight: bold;
          color: #333;
        }
        
        .signatures-section {
          margin-top: 15px;
          padding: 10px;
          background: white;
          border: 1px solid #ddd;
        }
        
        .signatures-title {
          font-size: 11px;
          font-weight: bold;
          color: #333;
          margin-bottom: 10px;
          text-transform: uppercase;
        }
        
        .signatures-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
        }
        
        .signature-box {
          text-align: center;
          border: 1px solid #ddd;
          padding: 10px;
          background: white;
        }
        
        .signature-label {
          font-size: 10px;
          font-weight: bold;
          color: #666;
          margin-bottom: 8px;
          text-transform: uppercase;
        }
        
        .signature-image {
          max-width: 120px;
          height: 60px;
          border: 1px solid #333;
          background: white;
          margin: 0 auto;
          display: block;
          object-fit: contain;
        }
        
        .signature-placeholder {
          width: 120px;
          height: 60px;
          border: 1px dashed #ccc;
          background: white;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #999;
          font-style: italic;
          font-size: 10px;
        }
        
        @media print { 
          body { 
            margin: 0;
            padding: 15px;
          }
          
          .phase-section { 
            page-break-inside: avoid; 
          }
          
          .document-header {
            margin-bottom: 20px;
          }
        }
      </style>
    </head>
    <body>
      <div class="document-header">
        <h1>Procurement Process Summary</h1>
        <h2>ICT Literacy and Competency Development Bureau</h2>
        <div class="meta">
          Document generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
        </div>
      </div>
      
      <div class="procurement-summary">
        <h3>Procurement Information</h3>
        <div class="summary-grid">
          <div class="summary-item"><strong>Title:</strong> ${currentProcurement.title}</div>
          <div class="summary-item"><strong>PR Number:</strong> ${currentProcurement.prNumber}</div>
          <div class="summary-item"><strong>Amount:</strong> ₱${currentProcurement.amount.toLocaleString()}</div>
          <div class="summary-item"><strong>Project Type:</strong> ${currentProcurement.projectType}</div>
          <div class="summary-item"><strong>Created:</strong> ${new Date(currentProcurement.createdAt).toLocaleDateString()}</div>
          <div class="summary-item"><strong>Current Status:</strong> Phase ${currentPhase} of 6</div>
        </div>
      </div>
      
      ${generatePhasesSummary()}
    </body>
    </html>
  `)

  printWindow.document.close()
  printWindow.focus()

  setTimeout(() => {
    printWindow.print()
    printWindow.close()
  }, 1000)
}

function generatePhasesSummary() {
  let html = ""

  for (let phase = 1; phase <= 6; phase++) {
    const config = phaseConfigs[phase]
    const phaseData = currentProcurement.phases[phase]
    const isCompleted = phaseData && phaseData.completedAt
    const isCurrent = phase === currentPhase && !isCompleted

    html += `
      <div class="phase-section ${isCompleted ? "completed" : ""} ${isCurrent ? "current" : ""}">
        <div class="phase-title">
          Phase ${phase}: ${config.title.replace(/^[^:]*:\s*/, "")} ${isCompleted ? "✓" : isCurrent ? "(In Progress)" : ""}
        </div>
        <div class="phase-meta">
          <strong>Responsible Unit:</strong> ${config.unit}
        </div>
        
        <div class="requirements-section">
          <div class="requirements-title">Requirements Checklist</div>
          <ul class="requirements-list">
            ${config.checklist
              .map((item, index) => {
                const isChecked = phaseData?.checklist?.[index] || false
                return `<li class="${isChecked ? "completed" : ""}">${item}</li>`
              })
              .join("")}
          </ul>
        </div>
        
        ${
          phaseData
            ? `
          <div class="phase-details">
            <div class="detail-row">
              <div class="detail-item">
                <strong>Submitted by:</strong> ${phaseData.submittedBy?.name || "Not completed"}
                ${phaseData.submittedBy?.date ? `<br><small>Date: ${new Date(phaseData.submittedBy.date).toLocaleDateString()}</small>` : ""}
              </div>
              <div class="detail-item">
                <strong>Received by:</strong> ${phaseData.receivedBy?.name || "Not completed"}
                ${phaseData.receivedBy?.date ? `<br><small>Date: ${new Date(phaseData.receivedBy.date).toLocaleDateString()}</small>` : ""}
              </div>
            </div>
            
            ${
              phaseData.submittedBy?.remarks
                ? `
              <div class="detail-item" style="margin-top: 8px;">
                <strong>Submitted Remarks:</strong> ${phaseData.submittedBy.remarks}
              </div>
            `
                : ""
            }
            
            ${
              phaseData.receivedBy?.remarks
                ? `
              <div class="detail-item" style="margin-top: 8px;">
                <strong>Received Remarks:</strong> ${phaseData.receivedBy.remarks}
              </div>
            `
                : ""
            }
            
            ${
              isCompleted
                ? `
              <div class="detail-item" style="margin-top: 8px;">
                <strong>Completed:</strong> ${new Date(phaseData.completedAt).toLocaleDateString()}
              </div>
            `
                : ""
            }
          </div>
          
          <div class="signatures-section">
            <div class="signatures-title">Digital Signatures</div>
            <div class="signatures-grid">
              <div class="signature-box">
                <div class="signature-label">Submitted By</div>
                ${
                  phaseData.signatures?.submitted &&
                  phaseData.signatures.submitted !==
                    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
                    ? `<img src="${phaseData.signatures.submitted}" alt="Submitted Signature" class="signature-image">`
                    : '<div class="signature-placeholder">No signature</div>'
                }
              </div>
              <div class="signature-box">
                <div class="signature-label">Received By</div>
                ${
                  phaseData.signatures?.received &&
                  phaseData.signatures.received !==
                    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
                    ? `<img src="${phaseData.signatures.received}" alt="Received Signature" class="signature-image">`
                    : '<div class="signature-placeholder">No signature</div>'
                }
              </div>
            </div>
          </div>
        `
            : '<div class="not-started">Phase not started</div>'
        }
      </div>
    `
  }

  return html
}

// Utility function to format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(amount)
}

// Auto-save functionality
setInterval(() => {
  if (currentProcurement && pages.preProc.classList.contains("active")) {
    savePhaseData()
  }
}, 30000) // Auto-save every 30 seconds

// Add real-time PR number formatting
document.addEventListener("DOMContentLoaded", () => {
  const prInput = document.getElementById("pr-number")
  if (prInput) {
    prInput.addEventListener("input", (e) => {
      let value = e.target.value.replace(/\D/g, "") // Remove non-digits

      if (value.length >= 4) {
        value = value.substring(0, 4) + "-" + value.substring(4)
      }
      if (value.length >= 7) {
        value = value.substring(0, 7) + "-" + value.substring(7, 9)
      }

      e.target.value = value
    })
  }
})
