function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

const toggleBtn = document.getElementById("themeToggle");

toggleBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");

    if (document.body.classList.contains("dark-mode")) {
        toggleBtn.textContent = "☀ Day Mode";
        localStorage.setItem("theme", "dark");
    } else {
        toggleBtn.textContent = "🌙 Night Mode";
        localStorage.setItem("theme", "light");
    }
});

// Load saved theme
window.addEventListener("DOMContentLoaded", () => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
        document.body.classList.add("dark-mode");
        toggleBtn.textContent = "☀ Day Mode";
    }
});

/* ========= SMART PLATELET NORMALIZER ========= */
function normalizePlatelet(value) {
  if (!value) return "";
  const num = Number(value);
  if (isNaN(num)) return value;

  // If entered in 10^9/L (e.g. 349)
  if (num > 10 && num < 1000) {
    return Math.round(num * 1000);
  }

  // Already cells/µL
  return Math.round(num);
}

async function generatePDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const logo = await loadImage("logo.png");
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  /* ================= RANGE CHECK ================= */
  function isOutOfRange(value, range) {
    if (!value || value === "-" || !range) return false;
    const num = Number(value);
    if (isNaN(num)) return false;

    if (range.includes("<")) return num > Number(range.replace("<", "").trim());
    if (range.includes(">=")) return num < Number(range.replace(">=", "").trim());

    if (range.includes("–") || range.includes("-")) {
      const [min, max] = range
        .replace("–", "-")
        .split("-")
        .map(v => Number(v.trim()));
      return num < min || num > max;
    }
    return false;
  }

  function underlineCellText(doc, data) {
    if (!data.cell || !data.cell.textPos) return;
    const text = String(data.cell.raw || "");
    if (!text) return;
    const x = data.cell.x + 2;
    const y = data.cell.textPos.y + 1.2;
    doc.line(x, y, x + doc.getTextWidth(text), y);
  }

  const tableStyle = {
    styles: { lineColor: [0, 0, 0], lineWidth: 0.5, fontSize: 9 },
    headStyles: { fillColor: false, textColor: 0 },
    didParseCell(data) {
  if (data.section === "body" && data.column.index === 1) {
    const range = data.row.raw[3];
    if (isOutOfRange(data.cell.raw, range)) {
      data.cell.styles.fontStyle = "bold";
      data.cell.styles.fontSize = 11;        
      data.cell.styles.textColor = [180, 0, 0];
    }
  }
},

    didDrawCell(data) {
      if (data.section === "body" && data.column.index === 1) {
        const range = data.row.raw[3];
        if (isOutOfRange(data.cell.raw, range)) {
          underlineCellText(doc, data);
        }
      }
    }
  };

  const v = id => document.getElementById(id)?.value || "";

  /* ================= HEADER ================= */
  function drawHeader() {
    const logoWidth = pageWidth * 0.92;
    let logoHeight = (logo.height * logoWidth) / logo.width;
    logoHeight = Math.min(Math.max(logoHeight, 25), 40);

    doc.addImage(logo, "PNG", (pageWidth - logoWidth) / 2, 16, logoWidth, logoHeight);

    let y = 16 + logoHeight + 14;
    doc.setFontSize(10);

    doc.rect(15, y, 85, 30);
    doc.text(`Patient Name : ${v("name")}`, 18, y + 7);
    doc.text(`Age / Gender : ${v("age")} / ${v("sex")}`, 18, y + 14);
    doc.text(`UAID / Lab Ref : ${v("uaid")}`, 18, y + 21);
    doc.text(`SIN No. : ${v("sin_no")}`, 18, y + 28);

    doc.rect(110, y, 85, 30);
    doc.text(`Sample Collection Time : ${v("sample_collection_time")}`, 113, y + 7);
    doc.text(`Sample Received Time : ${v("sample_received_time")}`, 113, y + 14);
    doc.text(`Reported Time : ${v("reported_time")}`, 113, y + 21);
    doc.text(`Ref. Doctor : ${v("ref_doctor")}`, 113, y + 28);

    return y + 40;
  }

  let hasContent = false;
  function startSection() {
    if (hasContent) doc.addPage();
    hasContent = true;
    return drawHeader();
  }

  /* ================= LIPID PROFILE ================= */
  if (v("tc") || v("tg") || v("hdl")) {
    let y = startSection();
    const vldl = v("tg") ? (v("tg") / 5).toFixed(1) : "-";
    const ldl = v("tc") && v("hdl") ? (v("tc") - v("hdl") - vldl).toFixed(1) : "-";

    doc.text("DEPARTMENT OF BIOCHEMISTRY", pageWidth / 2, y, { align: "center" });
    doc.setFont(undefined, "italic");
    doc.text("LIPID PROFILE", pageWidth / 2, y + 5, { align: "center" });
    doc.setFont(undefined, "normal");

    doc.autoTable({
      startY: y + 10,
      head: [["Test", "Result", "Unit", "Bio. Ref. Range"]],
      body: [
        ["Total Cholesterol", v("tc") || "-", "mg/dL", "< 200"],
        ["Triglycerides", v("tg") || "-", "mg/dL", "< 150"],
        ["HDL Cholesterol", v("hdl") || "-", "mg/dL", ">= 40"],
        ["LDL Cholesterol (Calc)", ldl, "mg/dL", "< 100"],
        ["VLDL Cholesterol (Calc)", vldl, "mg/dL", "5 - 40"]
      ],
      ...tableStyle
    });
  }

  /* ================= WHOLE BLOOD EDTA ================= */
  if (v("hba1c") || v("emp_glucose")) {
    let y = startSection();
    doc.text("DEPARTMENT OF BIOCHEMISTRY", pageWidth / 2, y, { align: "center" });
    doc.setFont(undefined, "italic");
    doc.text("WHOLE BLOOD EDTA", pageWidth / 2, y + 5, { align: "center" });
    doc.setFont(undefined, "normal");

    doc.autoTable({
      startY: y + 10,
      head: [["Test Name", "Result", "Unit", "Bio. Ref. Range", "Method"]],
      body: [
        ["HbA1c", v("hba1c") || "-", "%", "4.0 – 6.0", "HPLC"],
        ["Estimated Mean Plasma Glucose", v("emp_glucose") || "-", "mg/dL", "65 – 136", "Calculated"]
      ],
      ...tableStyle
    });
  }

  /* ================= LIVER FUNCTION SCREENING ================= */
  
  // Auto-calculate Indirect Bilirubin if Total & Direct exist
let indirectBilirubin = "";
if (v("bilirubin_total") && v("bilirubin_direct")) {
  const total = Number(v("bilirubin_total"));
  const direct = Number(v("bilirubin_direct"));
  if (!isNaN(total) && !isNaN(direct)) {
    indirectBilirubin = (total - direct).toFixed(2);
  }
}
  const lftFields = [
    ["Total Bilirubin", "bilirubin_total", "mg/dL", "0.3 – 1.2"],
    ["Direct Bilirubin", "bilirubin_direct", "mg/dL", "0.0 – 0.3"],
    ["Indirect Bilirubin", "bilirubin_indirect", "mg/dL", "0.2 – 0.9", indirectBilirubin],
    ["SGOT / AST", "sgot", "U/L", "< 40"],
    ["SGPT / ALT", "sgpt", "U/L", "< 41"],
    ["Alkaline Phosphatase", "alp", "U/L", "44 – 147"],
    ["Total Protein", "total_protein", "g/dL", "6.0 – 8.3"],
    ["Albumin", "albumin", "g/dL", "3.5 – 5.0"],
    ["Globulin", "globulin", "g/dL", "2.0 – 3.5"],
    ["A/G Ratio", "ag_ratio", "", "1.1 – 2.5"]
  ];

  const lftRows = lftFields
    .filter(f => v(f[1]))
    .map(f => [f[0], f[4] || v(f[1]), f[2], f[3]]);


  if (lftRows.length) {
    let y = startSection();
    doc.text("DEPARTMENT OF BIOCHEMISTRY", pageWidth / 2, y, { align: "center" });
    doc.setFont(undefined, "italic");
    doc.text("LIVER FUNCTION SCREENING", pageWidth / 2, y + 5, { align: "center" });
    doc.setFont(undefined, "normal");

    doc.autoTable({
      startY: y + 10,
      head: [["Test Name", "Result", "Unit", "Bio. Ref. Range"]],
      body: lftRows,
      ...tableStyle
    });
  }

  /* ================= RENAL FUNCTION SCREENING ================= */
  const renalFields = [
    ["Urea", "urea", "mg/dL", "10 - 50"],
    ["Blood Urea Nitrogen", "bun", "mg/dL", "5 - 23"],
    ["Creatinine", "creatinine", "mg/dL", "0.4 - 1.5"],
    ["eGFR", "egfr", "ml/min/1.73m²", "> 60"],
    ["Uric Acid", "uric_acid_renal", "mg/dL", "3.5 - 7.2"],
    ["BUN / Creatinine Ratio", "bun_creatinine_ratio", "", "10 - 25"],
    ["Urea / Creatinine Ratio", "urea_creatinine_ratio", "", "20 - 50"]
  ];

  const renalRows = renalFields
    .filter(f => v(f[1]))
    .map(f => [f[0], v(f[1]), f[2], f[3]]);

  if (renalRows.length) {
    let y = startSection();
    doc.text("DEPARTMENT OF BIOCHEMISTRY", pageWidth / 2, y, { align: "center" });
    doc.setFont(undefined, "italic");
    doc.text("RENAL FUNCTION SCREENING", pageWidth / 2, y + 5, { align: "center" });
    doc.setFont(undefined, "normal");

    doc.autoTable({
      startY: y + 10,
      head: [["Test Name", "Result", "Unit", "Bio. Ref. Range"]],
      body: renalRows,
      ...tableStyle
    });
  }

  /* ================= THYROID FUNCTION TESTS ================= */
  if (v("t3_total") || v("t4_total") || v("tsh_ultra")) {
    let y = startSection();
    doc.text("DEPARTMENT OF IMMUNOLOGY", pageWidth / 2, y, { align: "center" });
    doc.setFont(undefined, "italic");
    doc.text("THYROID FUNCTION TESTS", pageWidth / 2, y + 5, { align: "center" });
    doc.setFont(undefined, "normal");

    doc.autoTable({
      startY: y + 10,
      head: [["Test Name", "Result", "Unit", "Bio. Ref. Range"]],
      body: [
        ["T3 Total", v("t3_total") || "-", "ng/mL", "0.75 – 2.10"],
        ["T4 Total", v("t4_total") || "-", "µg/dL", "5.0 – 13.0"],
        ["Ultrasensitive TSH", v("tsh_ultra") || "-", "µIU/mL", "0.3 – 4.5"]
      ],
      ...tableStyle
    });
  }

/* ================= URIC ACID (SERUM) ================= */
if (v("uric_acid")) {
  let y = startSection();

  doc.text("DEPARTMENT OF BIOCHEMISTRY", pageWidth / 2, y, { align: "center" });
  doc.setFont(undefined, "italic");
  doc.text("URIC ACID (SERUM)", pageWidth / 2, y + 5, { align: "center" });
  doc.setFont(undefined, "normal");

  doc.autoTable({
    startY: y + 10,
    head: [["Test Name", "Result", "Unit", "Bio. Ref. Range"]],
    body: [
      ["Uric Acid", v("uric_acid"), "mg/dL", "3.5 – 7.2"]
    ],
    ...tableStyle
  });
}

   /* ================= CBC + DLC (SAME PAGE) ================= */

  const cbcFields = [
    ["Haemoglobin", "hb", "g/dL", "13.0 - 17.0"],
    ["RBC Count", "rbc", "million/µL", "4.50 - 5.50"],
    ["PCV", "pcv", "%", "40 - 52"],
    ["MCV", "mcv", "fL", "83 - 101"],
    ["MCH", "mch", "pg", "27 - 32"],
    ["MCHC", "mchc", "g/dL", "31.0 - 37.0"],
    ["RDW", "rdw", "%", "11.5 - 14.5"],
    ["Total Leucocyte Count", "tlc", "cells/µL", "4000 - 10000"]
  ];

  const dlcFields = [
    ["Neutrophils", "neutrophils", "%", "40 - 75"],
    ["Lymphocytes", "lymphocytes", "%", "20 - 45"],
    ["Monocytes", "monocytes", "%", "01 - 10"],
    ["Eosinophils", "eosinophils", "%", "01 - 06"],
    ["Basophils", "basophils", "%", "00 - 01"],
    ["Platelet Count", "platelets", "cells/µL", "150000 - 450000"]
  ];

  const cbcRows = cbcFields
    .filter(f => v(f[1]))
    .map(f => [f[0], v(f[1]), f[2], f[3]]);

  const dlcRows = dlcFields
    .filter(f => v(f[1]))
    .map(f =>
      f[0] === "Platelet Count"
        ? [f[0], normalizePlatelet(v("platelets")), f[2], f[3]]
        : [f[0], v(f[1]), f[2], f[3]]
    );

  if (cbcRows.length || dlcRows.length) {
    let y = startSection();

    doc.text("DEPARTMENT OF HAEMATOLOGY", pageWidth / 2, y, { align: "center" });
    doc.setFont(undefined, "italic");
    doc.text("COMPLETE BLOOD COUNT (CBC)", pageWidth / 2, y + 5, { align: "center" });
    doc.setFont(undefined, "normal");

    if (cbcRows.length) {
      doc.autoTable({
        startY: y + 10,
        head: [["Test Name", "Result", "Unit", "Bio. Ref. Range"]],
        body: cbcRows,
        ...tableStyle
      });
    }

    if (dlcRows.length) {
      const dlcStartY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 8 : y + 10;

      doc.setFont(undefined, "italic");
      doc.text("DIFFERENTIAL LEUCOCYTE COUNT (DLC)", pageWidth / 2, dlcStartY, { align: "center" });
      doc.setFont(undefined, "normal");

      doc.autoTable({
        startY: dlcStartY + 4,
        head: [["Test Name", "Result", "Unit", "Bio. Ref. Range"]],
        body: dlcRows,
        ...tableStyle
      });
    }
  }

  /* ================= FOOTER ================= */
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.line(15, pageHeight - 40, 85, pageHeight - 40);
    doc.text("Doctor's Signature", 15, pageHeight - 34);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - 20, pageHeight - 20, { align: "right" });
  }

let fileNameInput = document.getElementById("fileName").value.trim();

if (!fileNameInput) {
    fileNameInput = "Lab_Report";
}

// Remove invalid filename characters
fileNameInput = fileNameInput.replace(/[<>:"/\\|?*]+/g, "");

doc.save(fileNameInput + ".pdf");
}
