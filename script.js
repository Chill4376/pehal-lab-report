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

  // ===== BOXED INFO SECTIONS =====
  const boxHeight = 30;

  doc.setFontSize(10);

  // LEFT BOX
  doc.rect(15, currentY, 85, boxHeight);
  doc.text(`Patient Name : ${patientName}`, 18, currentY + 7);
  doc.text(`Age / Gender : ${patientAge} / ${patientSex}`, 18, currentY + 14);
  doc.text(`UAID / Lab Ref : ${uaid}`, 18, currentY + 21);
  doc.text(`SIN No. : ${sinNo}`, 18, currentY + 28);

  // RIGHT BOX
  doc.rect(110, currentY, 85, boxHeight);
  doc.text(`Sample Collection Time : ${sampleCollectionTime}`, 113, currentY + 7);
  doc.text(`Sample Received Time : ${sampleReceivedTime}`, 113, currentY + 14);
  doc.text(`Reported Time : ${reportedTime}`, 113, currentY + 21);
  doc.text(`Ref. Doctor : ${refDoctor}`, 113, currentY + 28);

  currentY += boxHeight + 10;

  // ===== LIPID INPUTS =====
  const tc = Number(document.getElementById("tc").value);
  const tg = Number(document.getElementById("tg").value);
  const hdl = Number(document.getElementById("hdl").value);

  const hasLipidData = tc || tg || hdl;

  if (hasLipidData) {
    const vldl = tg / 5;
    const ldl = tc - hdl - vldl;
    const chol_hdl_ratio = tc / hdl;
    const ldl_hdl_ratio = ldl / hdl;
    const tg_hdl_ratio = tg / hdl;
    const non_hdl = tc - hdl;
    const total_lipids = tc * 1.5;

    doc.autoTable({
      startY: currentY,
      head: [["Test", "Result", "Unit", "Reference Range"]],
      body: [
        ["Total Cholesterol", tc.toFixed(1), "mg/dL", "< 200"],
        ["Triglycerides", tg.toFixed(1), "mg/dL", "< 150"],
        ["HDL Cholesterol", hdl.toFixed(1), "mg/dL", ">= 40"],
        ["LDL Cholesterol (Calc)", ldl.toFixed(1), "mg/dL", "< 100"],
        ["VLDL Cholesterol (Calc)", vldl.toFixed(1), "mg/dL", "5 - 40"],
        ["CHOL / HDL Ratio", chol_hdl_ratio.toFixed(2), "", "4 - 6"],
        ["LDL / HDL Ratio", ldl_hdl_ratio.toFixed(2), "", "0.5 - 3.0"],
        ["Triglycerides / HDL Ratio", tg_hdl_ratio.toFixed(2), "", "< 3.12"],
        ["Non-HDL Cholesterol", non_hdl.toFixed(1), "mg/dL", "< 130"],
        ["Total Lipids", total_lipids.toFixed(1), "mg/dL", "350 - 700"]
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

    currentY = doc.lastAutoTable.finalY + 12;
  }

  // ===== BIOCHEMISTRY INPUTS =====
  const hba1c = document.getElementById("hba1c")?.value;
  const empGlucose = document.getElementById("emp_glucose")?.value;

  if (hba1c || empGlucose) {
    doc.setFontSize(11);
doc.text("DEPARTMENT OF BIOCHEMISTRY", pageWidth / 2, currentY, {
  align: "center"
});

doc.setFontSize(9);
doc.setFont(undefined, "italic");
doc.text("WHOLE BLOOD EDTA", pageWidth / 2, currentY + 5, {
  align: "center"
});
doc.setFont(undefined, "normal");

    doc.autoTable({
      startY: currentY + 6,
      head: [["Test Name", "Result", "Unit", "Bio. Ref. Range", "Method"]],
      body: [
        ["HbA1c, Glycated Hemoglobin", hba1c || "-", "%", "", "HPLC"],
        ["Estimated Mean Plasma Glucose", empGlucose || "-", "mg/dL", "65 - 136", "Calculated"]
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
  }

  // ===== DOCTOR SIGNATURE =====
  const pageHeight = doc.internal.pageSize.getHeight();
  const signatureX = 15;
  const signatureY = pageHeight - 40;

  doc.setLineWidth(0.5);
  doc.line(signatureX, signatureY, signatureX + 70, signatureY);
  doc.setFontSize(10);
  doc.text("Doctor's Signature", signatureX, signatureY + 6);

  if (refDoctor) {
    doc.text(`(${refDoctor})`, signatureX, signatureY + 12);
  }

  doc.save("Pehal_Grewal_Lab_Report.pdf");
}