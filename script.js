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

  // ========= READ INPUT VALUES ONCE =========
  const patientName = document.getElementById("name").value || "";
  const patientAge = document.getElementById("age").value || "";
  const patientSex = document.getElementById("sex").value || "";

  const uaidVal = document.getElementById("uaid").value || "";
  const sinVal = document.getElementById("sin_no").value || "";

  const sampleCollection = document.getElementById("sample_collection_time").value || "";
  const sampleReceived = document.getElementById("sample_received_time").value || "";
  const reportedTime = document.getElementById("reported_time").value || "";
  const refDoctor = document.getElementById("ref_doctor").value || "";

  // ========= COMMON HEADER =========
  function drawHeader() {
    const logoWidth = pageWidth * 0.92;
    let logoHeight = (logo.height * logoWidth) / logo.width;
    logoHeight = Math.min(Math.max(logoHeight, 25), 40);

    const logoX = (pageWidth - logoWidth) / 2;
    doc.addImage(logo, "PNG", logoX, 16, logoWidth, logoHeight);

    let y = 16 + logoHeight + 14;

    doc.setFontSize(10);

    // LEFT BOX
    doc.rect(15, y, 85, 30);
    doc.text(`Patient Name : ${patientName}`, 18, y + 7);
    doc.text(`Age / Gender : ${patientAge} / ${patientSex}`, 18, y + 14);
    doc.text(`UAID / Lab Ref : ${uaidVal}`, 18, y + 21);
    doc.text(`SIN No. : ${sinVal}`, 18, y + 28);

    // RIGHT BOX
    doc.rect(110, y, 85, 30);
    doc.text(`Sample Collection Time : ${sampleCollection}`, 113, y + 7);
    doc.text(`Sample Received Time : ${sampleReceived}`, 113, y + 14);
    doc.text(`Reported Time : ${reportedTime}`, 113, y + 21);
    doc.text(`Ref. Doctor : ${refDoctor}`, 113, y + 28);

    return y + 40;
  }

  // ========= BLACK TABLE STYLE =========
  const tableStyle = {
    styles: {
      lineColor: [0, 0, 0],
      lineWidth: 0.5,
      fontSize: 10
    },
    headStyles: {
      fillColor: false,
      textColor: 0,
      lineWidth: 0.5
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
    const ldl =
      tcV !== "-" && hdlV !== "-" && vldl !== "-"
        ? (tcV - hdlV - vldl).toFixed(1)
        : "-";

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
        ["HbA1c, Glycated Hemoglobin", hba1c.value || "-", "%", "", "HPLC"],
        ["Estimated Mean Plasma Glucose", emp_glucose.value || "-", "mg/dL", "65 - 136", "Calculated"]
      ],
      ...tableStyle
    });
  }

  // ========= URIC ACID SERUM =========
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
      body: [
        ["Uric Acid", Number(uric_acid.value).toFixed(2), "mg/dL", "3.5 - 7.2", "Uricase - PAP"]
      ],
      ...tableStyle
    });

    const commentY = doc.lastAutoTable.finalY + 6;
    doc.rect(15, commentY, pageWidth - 30, 65);

    doc.setFontSize(9);
    doc.text("Comment:", 18, commentY + 8);

    doc.setFontSize(8.5);
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
        "• Multiple sclerosis"
      ],
      18,
      commentY + 14
    );

    doc.text(
      [
        "Critical Values:",
        "",
        "Children  : > 12.0 mg/dL",
        "Adults    : > 13.0 mg/dL",
        "",
        "Such critical values",
        "require urgent",
        "medical attention."
      ],
      pageWidth - 80,
      commentY + 14
    );
  }

  // ========= FOOTER ON EVERY PAGE =========
  const totalPages = doc.getNumberOfPages();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    doc.setLineWidth(0.5);
    doc.line(15, pageHeight - 40, 85, pageHeight - 40);

    doc.setFontSize(10);
    doc.text("Doctor's Signature", 15, pageHeight - 34);

    if (refDoctor) {
      doc.text(`(${refDoctor})`, 15, pageHeight - 28);
    }

    doc.setFontSize(9);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - 20, pageHeight - 20, {
      align: "right"
    });
  }

  doc.save("Pehal_Grewal_Lab_Report.pdf");
}