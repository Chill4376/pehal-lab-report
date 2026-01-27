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
  const logoWidth = 120;
  const logoHeight = (logo.height * logoWidth) / logo.width;
  const logoX = (pageWidth - logoWidth) / 2;

  doc.addImage(logo, "PNG", logoX, 10, logoWidth, logoHeight);

  // ===== PATIENT DETAILS (INPUTS) =====
  const patientName = document.getElementById("name").value;
  const patientAge = document.getElementById("age").value;
  const patientSex = document.getElementById("sex").value;

  // ===== SAMPLE & REPORT DETAILS (INPUTS) =====
  const sampleCollectionTime = document.getElementById("sample_collection_time").value;
  const sampleReceivedTime = document.getElementById("sample_received_time").value;
  const reportedTime = document.getElementById("reported_time").value;
  const refDoctor = document.getElementById("ref_doctor").value;
  const uaid = document.getElementById("uaid").value;
  const sinNo = document.getElementById("sin_no").value;

  const infoStartY = 20 + logoHeight + 10;

  // ===== BOXED INFO SECTIONS =====
  const boxStartY = infoStartY;
  const boxHeight = 30;

  doc.setFontSize(10);

  // LEFT BOX — Patient / IDs
  doc.rect(15, boxStartY, 85, boxHeight);
  doc.text(`Patient Name : ${patientName}`, 18, boxStartY + 7);
  doc.text(`Age / Gender : ${patientAge} / ${patientSex}`, 18, boxStartY + 14);
  doc.text(`UAID / Lab Ref : ${uaid}`, 18, boxStartY + 21);
  doc.text(`SIN No. : ${sinNo}`, 18, boxStartY + 28);

  // RIGHT BOX — Sample / Report info
  doc.rect(110, boxStartY, 85, boxHeight);
  doc.text(`Sample Collection Time : ${sampleCollectionTime}`, 113, boxStartY + 7);
  doc.text(`Sample Received Time : ${sampleReceivedTime}`, 113, boxStartY + 14);
  doc.text(`Reported Time : ${reportedTime}`, 113, boxStartY + 21);
  doc.text(`Ref. Doctor : ${refDoctor}`, 113, boxStartY + 28);

  // ===== LIPID INPUTS =====
  const tc = Number(document.getElementById("tc").value);
  const tg = Number(document.getElementById("tg").value);
  const hdl = Number(document.getElementById("hdl").value);

  if (!tc || !tg || !hdl) {
    alert("Please enter all lipid values.");
    return;
  }

  // ===== CALCULATIONS =====
  const vldl = tg / 5;
  const ldl = tc - hdl - vldl;

  const chol_hdl_ratio = tc / hdl;
  const ldl_hdl_ratio = ldl / hdl;
  const tg_hdl_ratio = tg / hdl;
  const non_hdl = tc - hdl;
  const total_lipids = tc * 1.5;

  // ===== TABLE =====
  doc.autoTable({
    startY: boxStartY + boxHeight + 10,
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

  doc.save("Lipid_Profile_Report.pdf");
}
