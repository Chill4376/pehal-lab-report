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

  // ===== LOGO HEADER =====
  const logo = await loadImage("logo.png");

  const pageWidth = doc.internal.pageSize.getWidth();
  const logoWidth = pageWidth * 0.92;

  let logoHeight = (logo.height * logoWidth) / logo.width;
  if (logoHeight < 25) logoHeight = 25;
  if (logoHeight > 40) logoHeight = 40;

  const logoX = (pageWidth - logoWidth) / 2;
  const logoY = 16;

  doc.addImage(logo, "PNG", logoX, logoY, logoWidth, logoHeight);

  let currentY = logoY + logoHeight + 14;

  // ===== PATIENT DETAILS =====
  const patientName = document.getElementById("name").value;
  const patientAge = document.getElementById("age").value;
  const patientSex = document.getElementById("sex").value;

  // ===== SAMPLE & REPORT DETAILS =====
  const sampleCollectionTime = document.getElementById("sample_collection_time").value;
  const sampleReceivedTime = document.getElementById("sample_received_time").value;
  const reportedTime = document.getElementById("reported_time").value;
  const refDoctor = document.getElementById("ref_doctor").value;
  const uaid = document.getElementById("uaid").value;
  const sinNo = document.getElementById("sin_no").value;

  // ===== BOXED INFO =====
  const boxHeight = 30;
  doc.setFontSize(10);

  doc.rect(15, currentY, 85, boxHeight);
  doc.text(`Patient Name : ${patientName}`, 18, currentY + 7);
  doc.text(`Age / Gender : ${patientAge} / ${patientSex}`, 18, currentY + 14);
  doc.text(`UAID / Lab Ref : ${uaid}`, 18, currentY + 21);
  doc.text(`SIN No. : ${sinNo}`, 18, currentY + 28);

  doc.rect(110, currentY, 85, boxHeight);
  doc.text(`Sample Collection Time : ${sampleCollectionTime}`, 113, currentY + 7);
  doc.text(`Sample Received Time : ${sampleReceivedTime}`, 113, currentY + 14);
  doc.text(`Reported Time : ${reportedTime}`, 113, currentY + 21);
  doc.text(`Ref. Doctor : ${refDoctor}`, 113, currentY + 28);

  currentY += boxHeight + 10;

  // ===== LIPID PROFILE =====
  const tc = Number(document.getElementById("tc").value);
  const tg = Number(document.getElementById("tg").value);
  const hdl = Number(document.getElementById("hdl").value);

  if (tc || tg || hdl) {
    doc.setFontSize(11);
    doc.text("DEPARTMENT OF BIOCHEMISTRY", pageWidth / 2, currentY, { align: "center" });

    doc.setFontSize(9);
    doc.setFont(undefined, "italic");
    doc.text("LIPID PROFILE", pageWidth / 2, currentY + 5, { align: "center" });
    doc.setFont(undefined, "normal");

    currentY += 10;

    const vldl = tg / 5;
    const ldl = tc - hdl - vldl;

    doc.autoTable({
      startY: currentY,
      head: [["Test", "Result", "Unit", "Reference Range"]],
      body: [
        ["Total Cholesterol", tc || "-", "mg/dL", "< 200"],
        ["Triglycerides", tg || "-", "mg/dL", "< 150"],
        ["HDL Cholesterol", hdl || "-", "mg/dL", ">= 40"],
        ["LDL Cholesterol (Calc)", ldl || "-", "mg/dL", "< 100"],
        ["VLDL Cholesterol (Calc)", vldl || "-", "mg/dL", "5 - 40"]
      ],
      styles: { fontSize: 10 }
    });

    currentY = doc.lastAutoTable.finalY + 12;
  }

  // ===== WHOLE BLOOD EDTA =====
  const hba1c = document.getElementById("hba1c")?.value;
  const empGlucose = document.getElementById("emp_glucose")?.value;

  if (hba1c || empGlucose) {
    doc.setFontSize(11);
    doc.text("DEPARTMENT OF BIOCHEMISTRY", pageWidth / 2, currentY, { align: "center" });

    doc.setFontSize(9);
    doc.setFont(undefined, "italic");
    doc.text("WHOLE BLOOD EDTA", pageWidth / 2, currentY + 5, { align: "center" });
    doc.setFont(undefined, "normal");

    doc.autoTable({
      startY: currentY + 8,
      head: [["Test Name", "Result", "Unit", "Bio. Ref. Range", "Method"]],
      body: [
        ["HbA1c, Glycated Hemoglobin", hba1c || "-", "%", "", "HPLC"],
        ["Estimated Mean Plasma Glucose", empGlucose || "-", "mg/dL", "65 - 136", "Calculated"]
      ],
      styles: { fontSize: 10 }
    });

    currentY = doc.lastAutoTable.finalY + 12;
  }

  // ===== URIC ACID SERUM INPUT =====
const uricAcid = document.getElementById("uric_acid")?.value;

if (uricAcid) {
  // ---- Heading ----
  doc.setFontSize(11);
  doc.text("DEPARTMENT OF BIOCHEMISTRY", pageWidth / 2, currentY, {
    align: "center"
  });

  doc.setFontSize(9);
  doc.setFont(undefined, "italic");
  doc.text("URIC ACID SERUM", pageWidth / 2, currentY + 5, {
    align: "center"
  });
  doc.setFont(undefined, "normal");

  // ---- Table ----
  doc.autoTable({
    startY: currentY + 8,
    head: [["Test Name", "Result", "Unit", "Bio. Ref. Range", "Method"]],
    body: [
      ["Uric Acid", Number(uricAcid).toFixed(2), "mg/dL", "3.5 - 7.2", "Uricase - PAP"]
    ],
    styles: {
      lineColor: [0, 0, 0],
      lineWidth: 0.5,
      fontSize: 10
    },
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: 0
    }
  });

  // ---- COMMENT BOX ----
  const commentStartY = doc.lastAutoTable.finalY + 4;

  doc.setFontSize(9);
  doc.text("Comment:", 15, commentStartY + 5);

  doc.setFontSize(9);
  doc.text(
    [
      "Causes of Increased Levels:",
      "• High protein intake",
      "• Prolonged fasting",
      "• Gout",
      "• Lesch–Nyhan syndrome",
      "• Type 2 Diabetes Mellitus",
      "• Metabolic syndrome",
      "",
      "Causes of Decreased Levels:",
      "• Low zinc intake",
      "• OCP use",
      "• Multiple sclerosis",
      "",
      "Critical Value:",
      "Children : > 12.0 mg/dL",
      "Adults   : > 13.0 mg/dL",
      "Such critical values require urgent medical attention."
    ],
    18,
    commentStartY + 12
  );

  // Draw comment box border
  doc.rect(
    15,
    commentStartY + 2,
    pageWidth - 30,
    55
  );

  currentY = commentStartY + 60;
}

  // ===== SIGNATURE =====
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.line(15, pageHeight - 40, 85, pageHeight - 40);
  doc.text("Doctor's Signature", 15, pageHeight - 34);
  if (refDoctor) doc.text(`(${refDoctor})`, 15, pageHeight - 28);

  doc.save("Pehal_Grewal_Lab_Report.pdf");
}