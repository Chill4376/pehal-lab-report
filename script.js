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
const logoWidth = 80; // adjust if needed
const logoHeight = (logo.height * logoWidth) / logo.width;

doc.addImage(logo, "PNG", 15, 10, logoWidth, logoHeight);


  // Patient details
  const patientName = document.getElementById("name").value;
  const patientAge = document.getElementById("age").value;
  const patientSex = document.getElementById("sex").value;

  // Lipid inputs
  const tc = Number(document.getElementById("tc").value);
  const tg = Number(document.getElementById("tg").value);
  const hdl = Number(document.getElementById("hdl").value);

  // Basic validation
  if (!tc || !tg || !hdl) {
    alert("Please enter all lipid values.");
    return;
  }

  // Calculations
  const vldl = tg / 5;
  const ldl = tc - hdl - vldl;

  const chol_hdl_ratio = tc / hdl;
  const ldl_hdl_ratio = ldl / hdl;
  const tg_hdl_ratio = tg / hdl;
  const non_hdl = tc - hdl;
  const total_lipids = tc * 1.5;

  // Header
  doc.setFontSize(14);
  doc.text("PEHAL GREWAL HOSPITAL", 105, 15, null, null, "center");
  doc.setFontSize(11);
  doc.text("Diagnostic Laboratory", 105, 22, null, null, "center");

  // Patient info
  doc.text(`Patient: ${patientName}`, 15, 35);
  doc.text(`Age / Sex: ${patientAge} / ${patientSex}`, 15, 42);

  // Table
  doc.autoTable({
    startY: 55,
    head: [["Test", "Result", "Unit", "Reference Range"]],
    body: [
      ["Total Cholesterol", tc.toFixed(1), "mg/dL", "< 200"],
      ["Triglycerides", tg.toFixed(1), "mg/dL", "< 150"],
      ["HDL Cholesterol", hdl.toFixed(1), "mg/dL", "≥ 40"],

      ["LDL Cholesterol (Calc)", ldl.toFixed(1), "mg/dL", "< 100"],
      ["VLDL Cholesterol (Calc)", vldl.toFixed(1), "mg/dL", "5 – 40"],

      ["CHOL / HDL Ratio", chol_hdl_ratio.toFixed(2), "", "4 – 6"],
      ["LDL / HDL Ratio", ldl_hdl_ratio.toFixed(2), "", "0.5 – 3.0"],
      ["Triglycerides / HDL Ratio", tg_hdl_ratio.toFixed(2), "", "< 3.12"],

      ["Non-HDL Cholesterol", non_hdl.toFixed(1), "mg/dL", "< 130"],
      ["Total Lipids", total_lipids.toFixed(1), "mg/dL", "350 – 700"]
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
