function loadImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.src = url;
  });
}

async function generatePDF() {
  const doc = new window.jspdf.jsPDF();
  const logo = await loadImage("logo.png");

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // ========= RANGE CHECK =========
  function isOutOfRange(value, range) {
    if (!value || value === "-" || !range) return false;
    const num = Number(value);
    if (isNaN(num)) return false;

    if (range.includes("<")) return num >= Number(range.replace("<", "").trim());
    if (range.includes(">=")) return num < Number(range.replace(">=", "").trim());

    if (range.includes("–") || range.includes("-")) {
      const [min, max] = range.replace("–", "-").split("-").map(v => Number(v.trim()));
      return num < min || num > max;
    }
    return false;
  }

  // ========= UNDERLINE =========
  function underlineCellText(doc, data) {
    const text = String(data.cell.raw);
    const x = data.cell.x + 2;
    const y = data.cell.y + data.cell.height / 2 + 3;
    const textWidth = doc.getTextWidth(text);
    doc.setLineWidth(0.25);
    doc.line(x, y + 1.2, x + textWidth, y + 1.2);
  }

  // ========= INPUTS =========
  const patientName = document.getElementById("name")?.value || "";
  const patientAge = document.getElementById("age")?.value || "";
  const patientSex = document.getElementById("sex")?.value || "";
  const uaidVal = document.getElementById("uaid")?.value || "";
  const sinVal = document.getElementById("sin_no")?.value || "";
  const sampleCollection = document.getElementById("sample_collection_time")?.value || "";
  const sampleReceived = document.getElementById("sample_received_time")?.value || "";
  const reportedTime = document.getElementById("reported_time")?.value || "";
  const refDoctor = document.getElementById("ref_doctor")?.value || "";

  // ========= HEADER =========
  function drawHeader() {
    const logoWidth = pageWidth * 0.92;
    let logoHeight = (logo.height * logoWidth) / logo.width;
    logoHeight = Math.min(Math.max(logoHeight, 25), 40);

    doc.addImage(logo, "PNG", (pageWidth - logoWidth) / 2, 16, logoWidth, logoHeight);

    let y = 16 + logoHeight + 14;
    doc.setFontSize(10);

    doc.rect(15, y, 85, 30);
    doc.text(`Patient Name : ${patientName}`, 18, y + 7);
    doc.text(`Age / Gender : ${patientAge} / ${patientSex}`, 18, y + 14);
    doc.text(`UAID / Lab Ref : ${uaidVal}`, 18, y + 21);
    doc.text(`SIN No. : ${sinVal}`, 18, y + 28);

    doc.rect(110, y, 85, 30);
    doc.text(`Sample Collection Time : ${sampleCollection}`, 113, y + 7);
    doc.text(`Sample Received Time : ${sampleReceived}`, 113, y + 14);
    doc.text(`Reported Time : ${reportedTime}`, 113, y + 21);
    doc.text(`Ref. Doctor : ${refDoctor}`, 113, y + 28);

    return y + 40;
  }

  // ========= PAGE CONTROL (FIXES BLANK PAGE) =========
  let hasContent = false;
  function startSection() {
    if (hasContent) doc.addPage();
    hasContent = true;
    return drawHeader();
  }

  // ========= TABLE STYLE =========
  const tableStyle = {
    styles: { lineColor: [0, 0, 0], lineWidth: 0.5, fontSize: 10 },
    headStyles: { fillColor: false, textColor: 0, lineWidth: 0.5 },
    didParseCell(data) {
      if (data.section === "body" && data.column.index === 1) {
        const range = data.row.raw[3];
        if (isOutOfRange(data.cell.raw, range)) {
          data.cell.styles.fontStyle = "bold";
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

  // ========= LIPID PROFILE =========
  if (tc.value || tg.value || hdl.value) {
    let y = startSection();
    const tcV = tc.value || "-";
    const tgV = tg.value || "-";
    const hdlV = hdl.value || "-";
    const vldl = tgV !== "-" ? (tgV / 5).toFixed(1) : "-";
    const ldl = tcV !== "-" && hdlV !== "-" ? (tcV - hdlV - vldl).toFixed(1) : "-";

    doc.text("DEPARTMENT OF BIOCHEMISTRY", pageWidth / 2, y, { align: "center" });
    doc.setFontSize(9); doc.setFont(undefined, "italic");
    doc.text("LIPID PROFILE", pageWidth / 2, y + 5, { align: "center" });
    doc.setFont(undefined, "normal");

    doc.autoTable({
      startY: y + 10,
      head: [["Test", "Result", "Unit", "Reference Range"]],
      body: [
        ["Total Cholesterol", tcV, "mg/dL", "< 200"],
        ["Triglycerides", tgV, "mg/dL", "< 150"],
        ["HDL Cholesterol", hdlV, "mg/dL", ">= 40"],
        ["LDL Cholesterol (Calc)", ldl, "mg/dL", "< 100"],
        ["VLDL Cholesterol (Calc)", vldl, "mg/dL", "5 - 40"]
      ],
      ...tableStyle
    });
  }

  // ========= WHOLE BLOOD EDTA =========
  if (hba1c.value || emp_glucose.value) {
    let y = startSection();
    doc.text("DEPARTMENT OF BIOCHEMISTRY", pageWidth / 2, y, { align: "center" });
    doc.setFontSize(9); doc.setFont(undefined, "italic");
    doc.text("WHOLE BLOOD EDTA", pageWidth / 2, y + 5, { align: "center" });
    doc.setFont(undefined, "normal");

    doc.autoTable({
      startY: y + 10,
      head: [["Test Name", "Result", "Unit", "Bio. Ref. Range", "Method"]],
      body: [
        ["HbA1c", hba1c.value || "-", "%", "4.0 – 6.0", "HPLC"],
        ["Estimated Mean Plasma Glucose", emp_glucose.value || "-", "mg/dL", "65 – 136", "Calculated"]
      ],
      ...tableStyle
    });
  }

// ========= IMMUNOLOGY =========
const immunologyRows = [];

// Vitamin B12
if (document.getElementById("vitamin_b12")?.value) {
  immunologyRows.push({
    title: "Vitamin B12, SERUM",
    rows: [[
      "Vitamin B12",
      document.getElementById("vitamin_b12").value,
      "pg/mL",
      "192 - 827",
      "C.L.I.A"
    ]]
  });
}

// Vitamin D 25-Hydroxy
if (document.getElementById("vitamin_d")?.value) {
  const vitD = Number(document.getElementById("vitamin_d").value);

  let vitDStatus = "";
  if (vitD < 20) vitDStatus = "DEFICIENCY";
  else if (vitD < 30) vitDStatus = "INSUFFICIENCY";
  else if (vitD <= 100) vitDStatus = "SUFFICIENCY";
  else vitDStatus = "TOXICITY";

  immunologyRows.push({
    title: "Vitamin D 25 Hydroxy (D3), SERUM",
    rows: [[
      "Vitamin D (25 - OH Vitamin D)",
      vitD,
      "ng/mL",
      "<20 Deficiency | 20–<30 Insufficiency | 30–100 Sufficiency | >100 Toxicity",
      "CLIA"
    ]],
    comment: vitDStatus
  });
}

if (immunologyRows.length) {
  let y = startSection();

  doc.setFontSize(11);
  doc.text("DEPARTMENT OF IMMUNOLOGY", pageWidth / 2, y, { align: "center" });

  let currentY = y + 8;

  immunologyRows.forEach(section => {
    doc.setFontSize(9);
    doc.setFont(undefined, "italic");
    doc.text(`*${section.title}`, 15, currentY);
    doc.setFont(undefined, "normal");

    doc.autoTable({
      startY: currentY + 4,
      head: [["Test Name", "Result", "Unit", "Bio. Ref. Range", "Method"]],
      body: section.rows,
      ...tableStyle
    });

    currentY = doc.lastAutoTable.finalY + 4;

    if (section.comment) {
      doc.text("Comment:", 15, currentY + 4);

      doc.autoTable({
        startY: currentY + 6,
        head: [["Vitamin D Status", "Vitamin D 25 Hydroxy (ng/mL)"]],
        body: [
          ["DEFICIENCY", "< 20"],
          ["INSUFFICIENCY", "20 – < 30"],
          ["SUFFICIENCY", "30 – 100"],
          ["TOXICITY", "> 100"]
        ],
        styles: { fontSize: 9 },
        headStyles: { fillColor: false, textColor: 0 },
        theme: "grid"
      });

      doc.text(`Status: ${section.comment}`, 15, doc.lastAutoTable.finalY + 5);
      currentY = doc.lastAutoTable.finalY + 10;
    } else {
      currentY += 6;
    }
  });
}

  // ========= LIVER FUNCTION =========
  const lftFields = [
    ["Total Bilirubin", "bilirubin_total", "mg/dL", "0.3 – 1.2"],
    ["Direct Bilirubin", "bilirubin_direct", "mg/dL", "0.0 – 0.3"],
    ["Indirect Bilirubin", "bilirubin_indirect", "mg/dL", "0.2 – 0.9"],
    ["SGOT / AST", "sgot", "U/L", "< 40"],
    ["SGPT / ALT", "sgpt", "U/L", "< 41"],
    ["Alkaline Phosphatase", "alp", "U/L", "44 – 147"],
    ["Total Protein", "total_protein", "g/dL", "6.0 – 8.3"],
    ["Albumin", "albumin", "g/dL", "3.5 – 5.0"],
    ["Globulin", "globulin", "g/dL", "2.0 – 3.5"],
    ["A/G Ratio", "ag_ratio", "", "1.1 – 2.5"]
  ];
  const lftRows = lftFields.map(f =>
    document.getElementById(f[1])?.value ? [f[0], document.getElementById(f[1]).value, f[2], f[3]] : null
  ).filter(Boolean);

  if (lftRows.length) {
    let y = startSection();
    doc.text("DEPARTMENT OF BIOCHEMISTRY", pageWidth / 2, y, { align: "center" });
    doc.setFontSize(9); doc.setFont(undefined, "italic");
    doc.text("LIVER FUNCTION SCREENING", pageWidth / 2, y + 5, { align: "center" });
    doc.setFont(undefined, "normal");

    doc.autoTable({
      startY: y + 10,
      head: [["Test Name", "Result", "Unit", "Bio. Ref. Range"]],
      body: lftRows,
      ...tableStyle
    });
  }

// ========= THYROID FUNCTION TESTS =========
if (
  document.getElementById("t3_total")?.value ||
  document.getElementById("t4_total")?.value ||
  document.getElementById("tsh_ultra")?.value
) {
  let y = startSection();

  const t3 = document.getElementById("t3_total")?.value || "-";
  const t4 = document.getElementById("t4_total")?.value || "-";
  const tsh = document.getElementById("tsh_ultra")?.value || "-";

  doc.text("DEPARTMENT OF IMMUNOLOGY", pageWidth / 2, y, { align: "center" });
  doc.setFontSize(9);
  doc.setFont(undefined, "italic");
  doc.text(
    "THYROID PROFILE (Total T3, Total T4, Ultrasensitive TSH), SERUM",
    pageWidth / 2,
    y + 5,
    { align: "center" }
  );
  doc.setFont(undefined, "normal");

  doc.autoTable({
    startY: y + 10,
    head: [["Test Name", "Result", "Unit", "Bio. Ref. Range", "Method"]],
    body: [
      ["Tri-iodothyronine (T3, Total)", t3, "ng/mL", "0.75 – 2.10", "C.L.I.A"],
      ["Thyroxine (T4, Total)", t4, "µg/dL", "5.0 – 13.0", "C.L.I.A"],
      ["Ultrasensitive TSH", tsh, "µIU/mL", "0.3 – 4.5", "C.L.I.A"]
    ],
    ...tableStyle
  });

  // ===== Thyroid Comment =====
  let commentY = doc.lastAutoTable.finalY + 6;

  doc.text("Comment:", 15, commentY);
  doc.text("Kindly correlate clinically.", 15, commentY + 6);

  doc.autoTable({
    startY: commentY + 10,
    head: [["Category", "T3 (ng/mL)", "T4 (µg/dL)", "TSH (µIU/mL)"]],
    body: [
      ["Adults", "0.60 – 1.81", "3.20 – 12.6", "0.55 – 4.78"],
      ["Pregnant – 1st Trimester", "-", "-", "0.10 – 2.50"],
      ["Pregnant – 2nd Trimester", "-", "-", "0.20 – 3.00"],
      ["Pregnant – 3rd Trimester", "-", "-", "0.30 – 3.00"]
    ],
    styles: { fontSize: 8 },
    headStyles: { fillColor: false, textColor: 0 },
    theme: "grid"
  });
}

  // ========= RENAL FUNCTION =========
  const renalFields = [
    ["Urea", "urea", "mg/dL", "10 - 50", "Urease-GLDH"],
    ["Blood Urea Nitrogen", "bun", "mg/dL", "5 - 23", "Calculated"],
    ["Creatinine", "creatinine", "mg/dL", "0.4 - 1.5", "JAFFE’s"],
    ["GFR, Estimated", "egfr", "ml/min/1.73m²", "", "Calculated"],
    ["Uric Acid", "uric_acid_renal", "mg/dL", "3.5 - 7.2", "Uricase - PAP"],
    ["BUN / Creatinine Ratio", "bun_creatinine_ratio", "", "10 - 25", "Calculated"],
    ["Urea / Creatinine Ratio", "urea_creatinine_ratio", "", "20 - 50", "Calculated"]
  ];
  const renalRows = renalFields.map(f =>
    document.getElementById(f[1])?.value ? [f[0], document.getElementById(f[1]).value, f[2], f[3], f[4]] : null
  ).filter(Boolean);

  if (renalRows.length) {
    let y = startSection();
    doc.text("DEPARTMENT OF BIOCHEMISTRY", pageWidth / 2, y, { align: "center" });
    doc.setFontSize(9); doc.setFont(undefined, "italic");
    doc.text("RENAL FUNCTION SCREENING", pageWidth / 2, y + 5, { align: "center" });
    doc.setFont(undefined, "normal");

    doc.autoTable({
      startY: y + 10,
      head: [["Test Name", "Result", "Unit", "Bio. Ref. Range", "Method"]],
      body: renalRows,
      ...tableStyle
    });
  }

  // ========= CBC =========
  const cbcFields = [
    ["Haemoglobin", "hb", "g/dL", "13.0 - 17.0", "Cyan-methhemoglobin"],
    ["RBC Count", "rbc", "million/µL", "4.50 - 5.50", "Light scatter"],
    ["PCV", "pcv", "%", "40 - 52", "Mathematical Calculation"],
    ["MCV", "mcv", "fL", "83 - 101", "RBC Histogram"],
    ["MCH", "mch", "pg", "27 - 32", "Mathematical Calculation"],
    ["MCHC", "mchc", "g/dL", "31.0 - 37.0", "Mathematical Calculation"],
    ["RDW", "rdw", "%", "11.5 - 14.5", "RBC Histogram"],
    ["Total Leucocyte Count", "tlc", "cells/µL", "4000 - 10000", "Peroxidase/Basophil"]
  ];
  const cbcRows = cbcFields.map(f =>
    document.getElementById(f[1])?.value ? [f[0], document.getElementById(f[1]).value, f[2], f[3], f[4]] : null
  ).filter(Boolean);

  if (cbcRows.length) {
    let y = startSection();
    doc.text("DEPARTMENT OF HAEMATOLOGY", pageWidth / 2, y, { align: "center" });
    doc.setFontSize(9); doc.setFont(undefined, "italic");
    doc.text("COMPLETE BLOOD COUNT (CBC), WHOLE BLOOD EDTA", pageWidth / 2, y + 5, { align: "center" });
    doc.setFont(undefined, "normal");

    doc.autoTable({
      startY: y + 10,
      head: [["Test Name", "Result", "Unit", "Bio. Ref. Range", "Method"]],
      body: cbcRows,
      ...tableStyle
    });
  }

  // ========= DLC =========
  const dlcFields = [
    ["Neutrophils", "neutrophils", "%", "40 - 75", "Light scatter"],
    ["Absolute Neutrophil Count", "anc", "/µL", "2000 - 7000", "Flowcytometry"],
    ["Lymphocytes", "lymphocytes", "%", "20 - 45", "Light scatter"],
    ["Absolute Lymphocyte Count", "alc", "/cu mm", "1500 - 4000", "Light scatter"],
    ["Monocytes", "monocytes", "%", "01 - 10", "Light scatter"],
    ["Absolute Monocyte Count", "amc", "/cu mm", "200 - 800", "Light scatter"],
    ["Eosinophils", "eosinophils", "%", "01 - 06", "Light scatter"],
    ["Absolute Eosinophil Count", "aec", "/cu mm", "40 - 440", "Light scatter"],
    ["Basophils", "basophils", "%", "00 - 01", "Light scatter"],
    ["Absolute Basophil Count", "abc", "/µL", "20 - 100", "Flowcytometry"],
    ["Platelet Count", "platelets", "cells/µL", "150000 - 450000", "Light scatter"],
    ["PCT", "pct", "%", "0.19 - 0.39", "Mathematical Calculation"],
    ["MPV", "mpv", "fL", "6.8 - 10.9", "Platelet Histogram"]
  ];
  const dlcRows = dlcFields.map(f =>
    document.getElementById(f[1])?.value ? [f[0], document.getElementById(f[1]).value, f[2], f[3], f[4]] : null
  ).filter(Boolean);

  if (dlcRows.length) {
    let y = startSection();
    doc.text("DEPARTMENT OF HAEMATOLOGY", pageWidth / 2, y, { align: "center" });
    doc.setFontSize(9); doc.setFont(undefined, "italic");
    doc.text("DIFFERENTIAL LEUCOCYTE COUNT (DLC)", pageWidth / 2, y + 5, { align: "center" });
    doc.setFont(undefined, "normal");

    doc.autoTable({
      startY: y + 10,
      head: [["Test Name", "Result", "Unit", "Bio. Ref. Range", "Method"]],
      body: dlcRows,
      ...tableStyle
    });
  }

  // ========= FOOTER =========
const totalPages = doc.getNumberOfPages();

for (let i = 1; i <= totalPages; i++) {
  doc.setPage(i);
  doc.line(15, pageHeight - 40, 85, pageHeight - 40);
  doc.text("Doctor's Signature", 15, pageHeight - 34);

  if (refDoctor) {
    doc.text(`(${refDoctor})`, 15, pageHeight - 28);
  }

  doc.text(
    `Page ${i} of ${totalPages}`,
    pageWidth - 20,
    pageHeight - 20,
    { align: "right" }
  );
}

doc.save("Pehal_Grewal_Lab_Report.pdf");
}
