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

  // ========= RANGE CHECK HELPERS =========
  function isOutOfRange(value, range) {
    if (value === "-" || value === "" || value == null) return false;
    const num = Number(value);
    if (isNaN(num)) return false;

    if (range.includes("<")) {
      const max = Number(range.replace("<", "").trim());
      return num >= max;
    }
    if (range.includes(">=")) {
      const min = Number(range.replace(">=", "").trim());
      return num < min;
    }
    if (range.includes("–") || range.includes("-")) {
      const parts = range.replace("–", "-").split("-");
      const min = Number(parts[0].trim());
      const max = Number(parts[1].trim());
      return num < min || num > max;
    }
    return false;
  }

  function underlineCell(doc, data) {
    const { cell } = data;
    const x = cell.x + 2;
    const y = cell.y + cell.height - 3;
    const w = cell.width - 4;
    doc.line(x, y, x + w, y);
  }

  // ========= READ INPUTS =========
  const patientName = name.value || "";
  const patientAge = age.value || "";
  const patientSex = sex.value || "";
  const uaidVal = uaid.value || "";
  const sinVal = sin_no.value || "";
  const sampleCollection = sample_collection_time.value || "";
  const sampleReceived = sample_received_time.value || "";
  const reportedTime = reported_time.value || "";
  const refDoctor = ref_doctor.value || "";

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

  // ========= TABLE STYLE =========
  const tableStyle = {
    styles: { lineColor: [0, 0, 0], lineWidth: 0.5, fontSize: 10 },
    headStyles: { fillColor: false, textColor: 0, lineWidth: 0.5 },
    didParseCell(data) {
      if (data.section === "body" && data.column.index === 1) {
        const value = data.cell.raw;
        const range = data.row.raw[3];
        if (isOutOfRange(value, range)) {
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
    didDrawCell(data) {
      if (data.section === "body" && data.column.index === 1) {
        const value = data.cell.raw;
        const range = data.row.raw[3];
        if (isOutOfRange(value, range)) {
          underlineCell(doc, data);
        }
      }
    }
  };

  let firstPage = true;

  // ========= LIPID PROFILE =========
  if (tc.value || tg.value || hdl.value) {
    if (!firstPage) doc.addPage();
    firstPage = false;
    let y = drawHeader();

    doc.setFontSize(11);
    doc.text("DEPARTMENT OF BIOCHEMISTRY", pageWidth / 2, y, { align: "center" });
    doc.setFontSize(9);
    doc.setFont(undefined, "italic");
    doc.text("LIPID PROFILE", pageWidth / 2, y + 5, { align: "center" });
    doc.setFont(undefined, "normal");

    const tcV = Number(tc.value) || "-";
    const tgV = Number(tg.value) || "-";
    const hdlV = Number(hdl.value) || "-";
    const vldl = tgV !== "-" ? (tgV / 5).toFixed(1) : "-";
    const ldl = tcV !== "-" && hdlV !== "-" && vldl !== "-" ? (tcV - hdlV - vldl).toFixed(1) : "-";

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
    doc.addPage();
    let y = drawHeader();

    doc.setFontSize(11);
    doc.text("DEPARTMENT OF BIOCHEMISTRY", pageWidth / 2, y, { align: "center" });
    doc.setFontSize(9);
    doc.setFont(undefined, "italic");
    doc.text("WHOLE BLOOD EDTA", pageWidth / 2, y + 5, { align: "center" });
    doc.setFont(undefined, "normal");

    doc.autoTable({
      startY: y + 10,
      head: [["Test Name", "Result", "Unit", "Bio. Ref. Range", "Method"]],
      body: [
        ["HbA1c, Glycated Hemoglobin", hba1c.value || "-", "%", "4.0 – 6.0", "HPLC"],
        ["Estimated Mean Plasma Glucose", emp_glucose.value || "-", "mg/dL", "65 – 136", "Calculated"]
      ],
      ...tableStyle
    });
  }

  // ========= URIC ACID =========
  if (uric_acid.value) {
    doc.addPage();
    let y = drawHeader();

    doc.setFontSize(11);
    doc.text("DEPARTMENT OF BIOCHEMISTRY", pageWidth / 2, y, { align: "center" });
    doc.setFontSize(9);
    doc.setFont(undefined, "italic");
    doc.text("URIC ACID SERUM", pageWidth / 2, y + 5, { align: "center" });
    doc.setFont(undefined, "normal");

    doc.autoTable({
      startY: y + 10,
      head: [["Test Name", "Result", "Unit", "Bio. Ref. Range", "Method"]],
      body: [["Uric Acid", Number(uric_acid.value).toFixed(2), "mg/dL", "3.5 – 7.2", "Uricase - PAP"]],
      ...tableStyle
    });
  }

// ========= LIVER FUNCTION SCREENING =========
const lftFields = [
  {
    label: "Total Bilirubin",
    id: "bilirubin_total",
    unit: "mg/dL",
    range: "0.3 – 1.2"
  },
  {
    label: "Direct Bilirubin",
    id: "bilirubin_direct",
    unit: "mg/dL",
    range: "0.0 – 0.3"
  },
  {
    label: "Indirect Bilirubin",
    id: "bilirubin_indirect",
    unit: "mg/dL",
    range: "0.2 – 0.9"
  },
  {
    label: "SGOT / AST",
    id: "sgot",
    unit: "U/L",
    range: "< 40"
  },
  {
    label: "SGPT / ALT",
    id: "sgpt",
    unit: "U/L",
    range: "< 41"
  },
  {
    label: "Alkaline Phosphatase",
    id: "alp",
    unit: "U/L",
    range: "44 – 147"
  },
  {
    label: "Total Protein",
    id: "total_protein",
    unit: "g/dL",
    range: "6.0 – 8.3"
  },
  {
    label: "Albumin",
    id: "albumin",
    unit: "g/dL",
    range: "3.5 – 5.0"
  },
  {
    label: "Globulin",
    id: "globulin",
    unit: "g/dL",
    range: "2.0 – 3.5"
  },
  {
    label: "A/G Ratio",
    id: "ag_ratio",
    unit: "",
    range: "1.1 – 2.5"
  }
];

const lftRows = lftFields
  .map(f => {
    const val = document.getElementById(f.id)?.value;
    if (!val) return null;
    return [f.label, val, f.unit, f.range];
  })
  .filter(Boolean);

if (lftRows.length) {
  doc.addPage();
  let y = drawHeader();

  doc.setFontSize(11);
  doc.text("DEPARTMENT OF BIOCHEMISTRY", pageWidth / 2, y, { align: "center" });

  doc.setFontSize(9);
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

  // ========= FOOTER =========
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.line(15, pageHeight - 40, 85, pageHeight - 40);
    doc.text("Doctor's Signature", 15, pageHeight - 34);
    if (refDoctor) doc.text(`(${refDoctor})`, 15, pageHeight - 28);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - 20, pageHeight - 20, { align: "right" });
  }

  doc.save("Pehal_Grewal_Lab_Report.pdf");
}