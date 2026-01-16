import * as XLSX from "xlsx";
import { Suggestion, KriteriaSS, SifatPerbaikan } from "@/types/api";
import { formatEnumDisplay } from "@/types/utils";
import { showSuccess, showError } from "@/lib/toast";

const klasifikasiPenilaian = [
  { nilai: "1~3", kelas: "J" },
  { nilai: "4~6", kelas: "I" },
  { nilai: "7~9", kelas: "H" },
  { nilai: "10~12", kelas: "G" },
  { nilai: "13~15", kelas: "F" },
  { nilai: "16~18", kelas: "E" },
  { nilai: "19~21", kelas: "D" },
  { nilai: "22~24", kelas: "C" },
  { nilai: "25~27", kelas: "B" },
  { nilai: "28~30", kelas: "A" },
];

const getKelasFromScore = (score: number): string => {
  const klasifikasi = klasifikasiPenilaian.find((k) => {
    const [min, max] = k.nilai.split("~").map(Number);
    return score >= min && score <= max;
  });
  return klasifikasi?.kelas || "-";
};

const calculateTotalScore = (suggestion: Suggestion): number => {
  if (!suggestion.penilaian || suggestion.penilaian.length === 0) return 0;
  return suggestion.penilaian.reduce((sum, pen) => sum + pen.skorKriteria, 0);
};

export const exportSuggestionToExcel = (suggestion: Suggestion) => {
  try {
    const wb = XLSX.utils.book_new();
    
    // Sheet 1: Form SS
    const ws1Data: any[][] = [];
    
    // Header
    ws1Data.push(["PT Batara Dharma Persada"]);
    ws1Data.push(["2025 Continous Improvement"]);
    ws1Data.push(["Suggestion System"]);
    ws1Data.push([]);
    
    // No. Regist SS and Form Number
    ws1Data.push(["No. Regist SS", suggestion.noRegistSS || "", "", "", "", "No. Form : 01/ SS-PDCA/IX/2025"]);
    ws1Data.push([]);
    
    // Kriteria SS
    ws1Data.push(["*Kriteria SS", "Quality", "Cost", "Delivery", "Safety", "Morale", "Productivity"]);
    ws1Data.push([
      "",
      suggestion.kriteriaSS === KriteriaSS.QUALITY || suggestion.kriteriaSS === "QUALITY" ? "✓" : "",
      suggestion.kriteriaSS === KriteriaSS.COST || suggestion.kriteriaSS === "COST" ? "✓" : "",
      suggestion.kriteriaSS === KriteriaSS.DELIVERY || suggestion.kriteriaSS === "DELIVERY" ? "✓" : "",
      suggestion.kriteriaSS === KriteriaSS.SAFETY || suggestion.kriteriaSS === "SAFETY" ? "✓" : "",
      suggestion.kriteriaSS === KriteriaSS.MORALE || suggestion.kriteriaSS === "MORALE" ? "✓" : "",
      suggestion.kriteriaSS === KriteriaSS.PRODUCTIVITY || suggestion.kriteriaSS === "PRODUCTIVITY" ? "✓" : ""
    ]);
    
    // Sifat Perbaikan
    ws1Data.push(["*Sifat Perbaikan", "Menciptakan", "Meningkatkan", "Mencontoh"]);
    ws1Data.push([
      "",
      suggestion.sifatPerbaikan === SifatPerbaikan.MENCIPTAKAN || suggestion.sifatPerbaikan === "MENCIPTAKAN" ? "✓" : "",
      suggestion.sifatPerbaikan === SifatPerbaikan.MENINGKATKAN || suggestion.sifatPerbaikan === "MENINGKATKAN" ? "✓" : "",
      suggestion.sifatPerbaikan === SifatPerbaikan.MENCONTOH || suggestion.sifatPerbaikan === "MENCONTOH" ? "✓" : ""
    ]);
    ws1Data.push([]);
    
    // Two column layout
    // Data Pembuat SS (Left) and other fields (Right)
    ws1Data.push(["Data Pembuat SS", "", "", "", "Tanggal Usulan", suggestion.tanggalUsulan ? new Date(suggestion.tanggalUsulan).toLocaleDateString('id-ID') : new Date(suggestion.createdAt).toLocaleDateString('id-ID')]);
    ws1Data.push(["Nama Pembuat", suggestion.user ? `${suggestion.user.firstName} ${suggestion.user.lastName}` : "", "", "", "*Hubungan", suggestion.hubungan || ""]);
    ws1Data.push(["Jabatan/Dept", `${suggestion.user?.position ? formatEnumDisplay(suggestion.user.position) : ""} / ${suggestion.user?.department ? formatEnumDisplay(suggestion.user.department) : ""}`, "", "", "Penemuan", suggestion.hubungan === "Pekerjaannya" ? "✓ Pekerjaannya" : ""]);
    ws1Data.push(["No ID", suggestion.user?.nrp?.toString() || "", "", "", "", suggestion.hubungan === "Bukan" ? "✓ Bukan Pekerjaannya" : ""]);
    ws1Data.push([]);
    
    // Data Improvement (Left) and Syarat Ide Perbaikan (Right)
    ws1Data.push(["Data Improvement", "", "", "", "Syarat Ide Perbaikan (SS)"]);
    ws1Data.push(["Judul Ide/SS", suggestion.judulIde || "", "", "", "1. Harus memiliki manfaat yang jelas untuk perbaikan di lingkungan perusahaan."]);
    ws1Data.push(["Tanggal Efektif", suggestion.tanggalEfektif ? new Date(suggestion.tanggalEfektif).toLocaleDateString('id-ID') : "", "", "", "2. Improvement sifatnya merupakan perbaikan terhadap Standar/Metode/Peralatan dll."]);
    ws1Data.push(["", "", "", "", "3. Bukan merupakan suatu perbaikan kerusakan."]);
    ws1Data.push(["Masalah Yang Dihadapi :", "", "", "", "4. Bukan merupakan penggantian sesuatu yang hilang."]);
    ws1Data.push([suggestion.masalahYangDihadapi || "", "", "", "", "5. Bukan merupakan perbaikan yang berkaitan dengan peraturan perusahaan."]);
    ws1Data.push(["", "", "", "", "6. Bukan merupakan pengulangan dari usulan improvement sebelumnya."]);
    ws1Data.push([]);
    
    // Uraian Masalah (Left) and Hasil & Uraian Proses (Right)
    ws1Data.push(["Uraian Masalah / Kondisi Saat Ini", "", "", "", "Hasil & Uraian Proses"]);
    ws1Data.push([suggestion.uraianIde || "", "", "", "", suggestion.hasilUraianProses || ""]);
    ws1Data.push(["*Jika diperlukan detail penjelasan atau foto boleh ditampilkan di lampiran", "", "", "", "*Jika diperlukan detail penjelasan atau foto boleh ditampilkan di lampiran"]);
    ws1Data.push([]);
    
    // Ide & Proses Perbaikan (Left) and Evaluasi (Right)
    ws1Data.push(["Ide & Proses Perbaikan", "", "", "", "Evaluasi"]);
    ws1Data.push([suggestion.ideProsesPerbaikan || "", "", "", "", suggestion.evaluasiIde || ""]);
    ws1Data.push(["*Jika diperlukan detail penjelasan atau foto boleh ditampilkan di lampiran", "", "", "", "*Jika diperlukan detail penjelasan atau foto boleh ditampilkan di lampiran"]);
    ws1Data.push([]);
    
    // Komentar Atasan (Right side) and Nilai (Right side)
    ws1Data.push(["", "", "", "", "Komentar Atasan"]);
    ws1Data.push(["", "", "", "", suggestion.komentarAtasan || ""]);
    ws1Data.push(["", "", "", "", "*Jika diperlukan detail penjelasan atau foto boleh ditampilkan di lampiran"]);
    ws1Data.push([]);
    
    const totalScore = calculateTotalScore(suggestion);
    const kelas = getKelasFromScore(totalScore);
    ws1Data.push(["", "", "", "", "Nilai"]);
    ws1Data.push(["", "", "", "", "Total Nilai", totalScore > 0 ? totalScore.toString() : ""]);
    ws1Data.push(["", "", "", "", "Kelas", kelas]);
    ws1Data.push([]);
    
    // APPRV Section
    ws1Data.push(["APPRV"]);
    ws1Data.push(["Dibuat", "Diperiksa Atasan Langsung", "Diperiksa Supervisor", "Diperiksa Dept Head/PM"]);
    ws1Data.push(["Nama", "", "", ""]);
    ws1Data.push(["Jabatan", "", "", ""]);
    ws1Data.push(["Tanggal", "", "", ""]);
    ws1Data.push(["*Diisi dengan tanda ceklis (✓)"]);
    ws1Data.push([]);
    ws1Data.push(["NICE PROGRESS, TERIMA KASIH YA!! KAMI TUNGGU GEBRAKAN ANDA SELANJUTNYA"]);
    
    const ws1 = XLSX.utils.aoa_to_sheet(ws1Data);
    
    // Set column widths for Sheet 1
    ws1['!cols'] = [
      { wch: 25 },
      { wch: 20 },
      { wch: 15 },
      { wch: 15 },
      { wch: 30 },
      { wch: 30 },
      { wch: 15 },
    ];
    
    XLSX.utils.book_append_sheet(wb, ws1, "Form SS");
    
    // Sheet 2: Kriteria Penilaian
    const ws2Data: any[][] = [];
    
    ws2Data.push(["KRITERIA PENILAIAN SS - PT BATARA DHARMA PERSADA"]);
    ws2Data.push([`No. Form : ${suggestion.noRegistSS || "01/ SS-PDCA/IX/2025"}`]);
    ws2Data.push([]);
    
    // Header row
    ws2Data.push(["", "HASIL IDE USAHA", "NILAI", "Supervisor", "Dept. Head / PM"]);
    
    // Kriteria rows
    const kriteriaData = [
      { id: 1, nama: "Kualitas", scores: ["0 Tdk ada", "1 Peningkatan kualitas kerja di tempat kerja pengusul SS", "2 Adanya peningkatan kualitas kerja di tempat kerja pengusul SS dan kualitas kerja proses sesudahnya atau sebelumnya", "3 Peningkatan kualitas produk (hasil kerja) dan meningkatkan image perusahaan"] },
      { id: 2, nama: "Reduksi biaya", scores: ["0 Tdk ada", "1 Terdapat Reduksi Biaya"] },
      { id: 3, nama: "Delivery", scores: ["0 Tdk ada", "1 Memperlancar proses kerja pengusul SS", "2 Menjamin delivery hasil kerja yang tepat waktu pada proses berikutnya.", "3 Menjamin delivery hasil kerja yang tepat waktu pada setiap proses."] },
      { id: 4, nama: "Safety, Health & Env.", scores: ["0 Tdk ada", "1 Menjadi lebih aman dari sebelumnya", "2 Mencegah kecelakaan karena kecerobohan", "3 Mencegah kecelakaan sekalipun sudah berhati-hati / tidak ceroboh", "4 Dalam kondisi apapun kecelakaan bisa dicegah / tidak ada"] },
      { id: 5, nama: "Manfaat", scores: ["0 Tdk ada", "1 Hanya dapat digunakan untuk dirinya / prosesnya sendiri.", "2 Dapat dimanfaatkan oleh rekan kerja lain dalam satu bagian", "3 Dapat dimanfaatkan oleh semua bagian atau site."] },
      { id: 6, nama: "Keaslian Ide", scores: ["0 Tdk ada", "1 Ide sederhana dan hampir sama, dapat ditemukan di tempat lain.", "2 Modifikasi dari alat atau methode yang sudah ada", "3 Kombinasi dari beberapa ide, tapi ada penyempurnaan dari idenya sendiri", "4 Merupakan ide yang baru, kreatif dan inovatif"] },
      { id: 7, nama: "Kepekaan", scores: ["0 Tdk ada", "1 Memperbaiki atas saran / keluhan orang lain", "2 Inisiatif sendiri pada masalah sendiri yang sudah parah", "3 Memperbaiki hal-hal penting yang tidak diperhatikan orang lain"] },
      { id: 8, nama: "Perencanaan", scores: ["0 Tdk ada", "1 Perencanaan sederhana tanpa analisa data", "2 Perencanaan dengan analisa data"] },
      { id: 9, nama: "Pelaksanaan Ide", scores: ["0 Tdk ada", "1 Dapat direalisir dengan mudah tanpa persiapan khusus", "2 Perlu persiapan khusus untuk merealisasikan perbaikan", "3 Perlu kesungguhan dan melibatkan bagian lain untuk merealisasikan perbaikan", "4 Perlu perhitungan teknis dan persetujuan pihak lain atau pemenuhan terhadap persyaratan standar"] },
      { id: 10, nama: "Sumber Daya", scores: ["0 Tdk ada", "1 Menggunakan sumber daya yang baru", "2 Sebagian menggunakan sumber daya yang ada", "3 Seluruhnya menggunakan sumber daya yang ada"] }
    ];
    
    kriteriaData.forEach((item) => {
      const penilaianItem = suggestion.penilaian?.find(p => {
        const penilaianKriteriaLower = (p.penilaianKriteria || "").toLowerCase();
        const kriteriaNamaLower = item.nama.toLowerCase();
        return penilaianKriteriaLower.includes(kriteriaNamaLower.split(" ")[0]);
      });
      
      const score = penilaianItem?.skorKriteria || 0;
      const description = `${item.id} ${item.nama}\n${item.scores.join("\n")}`;
      
      ws2Data.push([item.id, description, "Nilai", score > 0 ? score : "", score > 0 ? score : ""]);
    });
    
    // Total row
    ws2Data.push([]);
    ws2Data.push(["T O T A L", "N I L A I", totalScore > 0 ? totalScore : "", "P A R A F"]);
    ws2Data.push([]);
    
    // Klasifikasi Penilaian
    ws2Data.push(["KLASIFIKASI PENILAIAN"]);
    ws2Data.push(["N I L A I", ...klasifikasiPenilaian.map(k => k.nilai)]);
    ws2Data.push(["K E L A S", ...klasifikasiPenilaian.map(k => k.kelas)]);
    ws2Data.push([]);
    
    // Aliran Penilaian
    ws2Data.push(["ALIRAN PENILAIAN SUGGESTION SYSTEM"]);
    ws2Data.push(["PEMBUAT SS", "ATASAN LANGSUNG", "SPV/ dan DEPT HEAD/PM", "TEAM SS"]);
    ws2Data.push([
      "- Perhatikan ketentuan pembuatan SS\n- Isi form SS dengan lengkap dan jelas\n- Lengkapi dengan gambar / ilustrasi dan perhitungan hasil perbaikan (penurunan cost, man hour, dll)\n- Tuliskan manfaat SS anda selengkap dalam format QCDSMP\n- SS diajukan ke atasan langsung untuk diperiksa sebelum dinilai oleh SPV/Dept Head/Manager",
      "- Teliti keaslian ide (SS) yang diajukan\n- Periksa perbaikan yang dilakukan\n- Lakukan koreksi bila perlu\n- Berikan komentar atas ide (SS) tersebut\n- Teruskan ke SPV/Dept Head untuk dinilai",
      "- Periksa perbaikan yang dilakukan\n- Lakukan penilaian sesuai dengan Kriteria Penilaian SS di atas\n- Menyerahkan hasil penilaian ke Team SS",
      "- Mendata SS yg masuk & memberi nomor registrasi"
    ]);
    
    const ws2 = XLSX.utils.aoa_to_sheet(ws2Data);
    
    // Set column widths for Sheet 2
    ws2['!cols'] = [
      { wch: 10 },
      { wch: 80 },
      { wch: 15 },
      { wch: 15 },
      { wch: 20 },
    ];
    
    XLSX.utils.book_append_sheet(wb, ws2, "Kriteria Penilaian");
    
    const fileName = `SS_${suggestion.noRegistSS || suggestion.id}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    showSuccess("Suggestion exported to Excel successfully!");
  } catch (err) {
    showError(err instanceof Error ? err.message : "Failed to export to Excel");
  }
};

export const exportSuggestionToPDF = async (suggestion: Suggestion) => {
  try {
    const jsPDFModule = await import("jspdf");
    const jsPDF = jsPDFModule.default;
    const autoTableModule = await import("jspdf-autotable");
    const autoTable = autoTableModule.default || autoTableModule;
    
    const doc = new jsPDF('portrait', 'mm', 'a4');
    
    if (typeof autoTable !== 'function') {
      throw new Error("autoTable function not available. Please ensure jspdf-autotable is installed correctly.");
    }
    
    // ============================================
    // PAGE 1: FORM SS
    // ============================================
    
    // Header Section
    doc.setFontSize(14);
    doc.setFont("helvetica", 'bold');
    doc.text("PT Batara Dharma Persada", 105, 12, { align: 'center' });
    doc.setFontSize(11);
    doc.text("2025 Continous Improvement", 105, 18, { align: 'center' });
    doc.text("Suggestion System", 105, 23, { align: 'center' });
    
    let yPos = 30;
    
    // No. Regist SS and Form Number side by side
    doc.setFontSize(9);
    doc.setFont("helvetica", 'normal');
    doc.text("No. Regist SS", 10, yPos);
    doc.text("No. Form : 01/ SS-PDCA/IX/2025", 150, yPos);
    yPos += 6;
    
    // Box for No. Regist SS
    doc.rect(10, yPos - 4, 60, 6);
    doc.text(suggestion.noRegistSS || "", 12, yPos);
    yPos += 8;
    
    // Kriteria SS table
    const kriteriaChecked = [
      suggestion.kriteriaSS === KriteriaSS.QUALITY || suggestion.kriteriaSS === "QUALITY" ? "✓" : "",
      suggestion.kriteriaSS === KriteriaSS.COST || suggestion.kriteriaSS === "COST" ? "✓" : "",
      suggestion.kriteriaSS === KriteriaSS.DELIVERY || suggestion.kriteriaSS === "DELIVERY" ? "✓" : "",
      suggestion.kriteriaSS === KriteriaSS.SAFETY || suggestion.kriteriaSS === "SAFETY" ? "✓" : "",
      suggestion.kriteriaSS === KriteriaSS.MORALE || suggestion.kriteriaSS === "MORALE" ? "✓" : "",
      suggestion.kriteriaSS === KriteriaSS.PRODUCTIVITY || suggestion.kriteriaSS === "PRODUCTIVITY" ? "✓" : "",
    ];
    
    autoTable(doc, {
      startY: yPos,
      head: [["*Kriteria SS", "Quality", "Cost", "Delivery", "Safety", "Morale", "Productivity"]],
      body: [["", ...kriteriaChecked]],
      theme: 'grid',
      styles: { 
        fontSize: 8, 
        cellPadding: 2,
        lineWidth: 0.1,
        lineColor: [0, 0, 0],
        textColor: [0, 0, 0],
        halign: 'center',
        valign: 'middle'
      },
      headStyles: { 
        fillColor: [255, 255, 255], 
        textColor: [0, 0, 0], 
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: 25, halign: 'left', fontStyle: 'bold' }
      },
      margin: { left: 10, right: 10 }
    });
    // @ts-expect-error - lastAutoTable is added by jspdf-autotable plugin
    yPos = doc.lastAutoTable.finalY + 2;
    
    // Sifat Perbaikan table
    const sifatChecked = [
      suggestion.sifatPerbaikan === SifatPerbaikan.MENCIPTAKAN || suggestion.sifatPerbaikan === "MENCIPTAKAN" ? "✓" : "",
      suggestion.sifatPerbaikan === SifatPerbaikan.MENINGKATKAN || suggestion.sifatPerbaikan === "MENINGKATKAN" ? "✓" : "",
      suggestion.sifatPerbaikan === SifatPerbaikan.MENCONTOH || suggestion.sifatPerbaikan === "MENCONTOH" ? "✓" : "",
    ];
    
    autoTable(doc, {
      startY: yPos,
      head: [["*Sifat Perbaikan", "Menciptakan", "Meningkatkan", "Mencontoh"]],
      body: [["", ...sifatChecked]],
      theme: 'grid',
      styles: { 
        fontSize: 8, 
        cellPadding: 2,
        lineWidth: 0.1,
        lineColor: [0, 0, 0],
        textColor: [0, 0, 0],
        halign: 'center',
        valign: 'middle'
      },
      headStyles: { 
        fillColor: [255, 255, 255], 
        textColor: [0, 0, 0], 
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: 25, halign: 'left', fontStyle: 'bold' },
        1: { cellWidth: 25 },
        2: { cellWidth: 25 },
        3: { cellWidth: 25 }
      },
      margin: { left: 10, right: 10 }
    });
    // @ts-expect-error - lastAutoTable is added by jspdf-autotable plugin
    yPos = doc.lastAutoTable.finalY + 6;
    
    // Two-column layout
    const leftCol = 10;
    const rightCol = 110;
    const leftWidth = 95;
    const rightWidth = 90;
    
    // LEFT COLUMN - Data Pembuat SS
    let leftY = yPos;
    doc.setFontSize(9);
    doc.setFont("helvetica", 'bold');
    doc.text("Data Pembuat SS", leftCol, leftY);
    
    // Draw box around Data Pembuat SS
    doc.rect(leftCol, leftY + 2, leftWidth, 28);
    leftY += 7;
    
    doc.setFont("helvetica", 'normal');
    doc.setFontSize(8);
    doc.text("Nama Pembuat", leftCol + 2, leftY);
    doc.text(suggestion.user ? `${suggestion.user.firstName} ${suggestion.user.lastName}` : "", leftCol + 30, leftY);
    leftY += 5;
    
    doc.text("Jabatan/Dept", leftCol + 2, leftY);
    const jabatanDept = `${suggestion.user?.position ? formatEnumDisplay(suggestion.user.position) : ""} / ${suggestion.user?.department ? formatEnumDisplay(suggestion.user.department) : ""}`;
    doc.text(jabatanDept, leftCol + 30, leftY);
    leftY += 5;
    
    doc.text("No ID", leftCol + 2, leftY);
    doc.text(suggestion.user?.nrp?.toString() || "", leftCol + 30, leftY);
    leftY += 10;
    
    // RIGHT COLUMN - aligned with Data Pembuat SS
    let rightY = yPos + 7;
    doc.setFont("helvetica", 'normal');
    doc.setFontSize(8);
    doc.text("Tanggal Usulan", rightCol, rightY);
    doc.text(suggestion.tanggalUsulan ? new Date(suggestion.tanggalUsulan).toLocaleDateString('id-ID') : new Date(suggestion.createdAt).toLocaleDateString('id-ID'), rightCol + 30, rightY);
    rightY += 5;
    
    doc.text("*Hubungan", rightCol, rightY);
    rightY += 5;
    
    // Hubungan options
    doc.text("Penemuan", rightCol + 2, rightY);
    doc.rect(rightCol + 18, rightY - 3, 4, 4);
    if (suggestion.hubungan === "Pekerjaannya") {
      doc.text("✓", rightCol + 19, rightY);
    }
    
    doc.text("Pekerjaannya", rightCol + 25, rightY);
    doc.rect(rightCol + 45, rightY - 3, 4, 4);
    
    rightY += 5;
    doc.text("Bukan Pekerjaannya", rightCol + 25, rightY);
    doc.rect(rightCol + 55, rightY - 3, 4, 4);
    if (suggestion.hubungan === "Bukan") {
      doc.text("✓", rightCol + 56, rightY);
    }
    rightY += 10;
    
    // LEFT COLUMN - Data Improvement
    doc.setFont("helvetica", 'bold');
    doc.text("Data Improvement", leftCol, leftY);
    
    // Draw box
    const improvementBoxHeight = 35;
    doc.rect(leftCol, leftY + 2, leftWidth, improvementBoxHeight);
    leftY += 7;
    
    doc.setFont("helvetica", 'normal');
    doc.text("Judul Ide/SS", leftCol + 2, leftY);
    leftY += 4;
    const judulLines = doc.splitTextToSize(suggestion.judulIde || "", leftWidth - 4);
    doc.text(judulLines, leftCol + 2, leftY);
    leftY += (judulLines.length * 4) + 3;
    
    doc.text("Tanggal Efektif", leftCol + 2, leftY);
    doc.text(suggestion.tanggalEfektif ? new Date(suggestion.tanggalEfektif).toLocaleDateString('id-ID') : "", leftCol + 30, leftY);
    leftY += improvementBoxHeight - ((judulLines.length * 4) + 17);
    
    // Masalah Yang Dihadapi
    leftY += 5;
    doc.setFont("helvetica", 'bold');
    doc.text("Masalah Yang Dihadapi :", leftCol, leftY);
    const masalahBoxHeight = 25;
    doc.rect(leftCol, leftY + 2, leftWidth, masalahBoxHeight);
    leftY += 6;
    
    doc.setFont("helvetica", 'normal');
    const masalahLines = doc.splitTextToSize(suggestion.masalahYangDihadapi || "", leftWidth - 4);
    doc.text(masalahLines, leftCol + 2, leftY);
    leftY += masalahBoxHeight + 3;
    
    // Uraian Masalah / Kondisi
    doc.setFont("helvetica", 'bold');
    doc.text("Uraian Masalah / Kondisi Saat Ini", leftCol, leftY);
    const uraianBoxHeight = 30;
    doc.rect(leftCol, leftY + 2, leftWidth, uraianBoxHeight);
    leftY += 6;
    
    doc.setFont("helvetica", 'normal');
    const uraianLines = doc.splitTextToSize(suggestion.uraianIde || "", leftWidth - 4);
    doc.text(uraianLines, leftCol + 2, leftY);
    leftY += uraianBoxHeight;
    
    doc.setFontSize(7);
    doc.text("*Jika diperlukan detail penjelasan atau foto boleh ditampilkan di lampiran", leftCol, leftY + 2);
    leftY += 6;
    
    // Ide & Proses Perbaikan
    doc.setFontSize(8);
    doc.setFont("helvetica", 'bold');
    doc.text("Ide & Proses Perbaikan", leftCol, leftY);
    const ideBoxHeight = 30;
    doc.rect(leftCol, leftY + 2, leftWidth, ideBoxHeight);
    leftY += 6;
    
    doc.setFont("helvetica", 'normal');
    const ideLines = doc.splitTextToSize(suggestion.ideProsesPerbaikan || "", leftWidth - 4);
    doc.text(ideLines, leftCol + 2, leftY);
    leftY += ideBoxHeight;
    
    doc.setFontSize(7);
    doc.text("*Jika diperlukan detail penjelasan atau foto boleh ditampilkan di lampiran", leftCol, leftY + 2);
    
    // RIGHT COLUMN - Syarat Ide Perbaikan (SS)
    doc.setFontSize(8);
    doc.setFont("helvetica", 'bold');
    doc.text("Syarat Ide Perbaikan (SS)", rightCol, rightY);
    
    const syaratBoxHeight = 38;
    doc.rect(rightCol, rightY + 2, rightWidth, syaratBoxHeight);
    rightY += 6;
    
    doc.setFont("helvetica", 'normal');
    doc.setFontSize(7);
    const syaratList = [
      "1. Harus memiliki manfaat yang jelas untuk perbaikan di",
      "   lingkungan perusahaan.",
      "2. Improvement sifatnya merupakan perbaikan terhadap",
      "   Standar/Metode/Peralatan dll.",
      "3. Bukan merupakan suatu perbaikan kerusakan.",
      "4. Bukan merupakan penggantian sesuatu yang hilang.",
      "5. Bukan merupakan perbaikan yang berkaitan dengan",
      "   peraturan perusahaan.",
      "6. Bukan merupakan pengulangan dari usulan improvement",
      "   sebelumnya."
    ];
    syaratList.forEach((line) => {
      doc.text(line, rightCol + 2, rightY);
      rightY += 3.5;
    });
    rightY += 4;
    
    // Hasil & Uraian Proses
    doc.setFontSize(8);
    doc.setFont("helvetica", 'bold');
    doc.text("Hasil & Uraian Proses", rightCol, rightY);
    const hasilBoxHeight = 30;
    doc.rect(rightCol, rightY + 2, rightWidth, hasilBoxHeight);
    rightY += 6;
    
    doc.setFont("helvetica", 'normal');
    const hasilLines = doc.splitTextToSize(suggestion.hasilUraianProses || "", rightWidth - 4);
    doc.text(hasilLines, rightCol + 2, rightY);
    rightY += hasilBoxHeight;
    
    doc.setFontSize(7);
    doc.text("*Jika diperlukan detail penjelasan atau foto boleh ditampilkan di lampiran", rightCol, rightY + 2);
    rightY += 6;
    
    // Evaluasi
    doc.setFontSize(8);
    doc.setFont("helvetica", 'bold');
    doc.text("Evaluasi", rightCol, rightY);
    const evaluasiBoxHeight = 30;
    doc.rect(rightCol, rightY + 2, rightWidth, evaluasiBoxHeight);
    rightY += 6;
    
    doc.setFont("helvetica", 'normal');
    const evaluasiLines = doc.splitTextToSize(suggestion.evaluasiIde || "", rightWidth - 4);
    doc.text(evaluasiLines, rightCol + 2, rightY);
    rightY += evaluasiBoxHeight;
    
    doc.setFontSize(7);
    doc.text("*Jika diperlukan detail penjelasan atau foto boleh ditampilkan di lampiran", rightCol, rightY + 2);
    rightY += 6;
    
    // Komentar Atasan
    doc.setFontSize(8);
    doc.setFont("helvetica", 'bold');
    doc.text("Komentar Atasan", rightCol, rightY);
    const komentarBoxHeight = 20;
    doc.rect(rightCol, rightY + 2, rightWidth, komentarBoxHeight);
    rightY += 6;
    
    doc.setFont("helvetica", 'normal');
    const komentarLines = doc.splitTextToSize(suggestion.komentarAtasan || "", rightWidth - 4);
    doc.text(komentarLines, rightCol + 2, rightY);
    rightY += komentarBoxHeight;
    
    doc.setFontSize(7);
    doc.text("*Jika diperlukan detail penjelasan atau foto boleh ditampilkan di lampiran", rightCol, rightY + 2);
    rightY += 6;
    
    // Nilai (Score)
    const totalScore = calculateTotalScore(suggestion);
    const kelas = getKelasFromScore(totalScore);
    
    doc.setFontSize(8);
    doc.setFont("helvetica", 'bold');
    doc.text("Nilai", rightCol, rightY);
    
    // Draw table for score
    autoTable(doc, {
      startY: rightY + 2,
      head: [["Total Nilai", "Kelas"]],
      body: [[totalScore > 0 ? totalScore.toString() : "", kelas]],
      theme: 'grid',
      styles: { 
        fontSize: 8, 
        cellPadding: 3,
        lineWidth: 0.1,
        lineColor: [0, 0, 0],
        textColor: [0, 0, 0],
        halign: 'center',
        valign: 'middle'
      },
      headStyles: { 
        fillColor: [255, 255, 255], 
        textColor: [0, 0, 0], 
        fontStyle: 'bold',
        halign: 'center'
      },
      margin: { left: rightCol },
      columnStyles: {
        0: { cellWidth: rightWidth / 2 },
        1: { cellWidth: rightWidth / 2 }
      }
    });
    
    // Approval section at bottom of page 1
    // @ts-expect-error - lastAutoTable is added by jspdf-autotable plugin
    const approvalY = Math.max(leftY, doc.lastAutoTable ? doc.lastAutoTable.finalY : rightY) + 8;
    
    // APPRV header row
    autoTable(doc, {
      startY: approvalY,
      head: [["APPRV"]],
      body: [],
      theme: 'grid',
      styles: { 
        fontSize: 7, 
        cellPadding: 2,
        lineWidth: 0.1,
        lineColor: [0, 0, 0],
        textColor: [0, 0, 0],
        halign: 'center',
        valign: 'middle',
        fontStyle: 'bold'
      },
      headStyles: { 
        fillColor: [255, 255, 255], 
        textColor: [0, 0, 0], 
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: 15 }
      },
      margin: { left: 10 }
    });
    
    // @ts-expect-error - lastAutoTable is added by jspdf-autotable plugin
    const approvalTableY = doc.lastAutoTable.finalY;
    
    // Main approval table
    autoTable(doc, {
      startY: approvalTableY,
      head: [["Dibuat", "Diperiksa\nAtasan Langsung", "Diperiksa\nSupervisor", "Diperiksa\nDept Head/PM"]],
      body: [
        ["Nama", "", "", ""],
        ["Jabatan", "", "", ""],
        ["Tanggal", "", "", ""]
      ],
      theme: 'grid',
      styles: { 
        fontSize: 7, 
        cellPadding: 2,
        lineWidth: 0.1,
        lineColor: [0, 0, 0],
        textColor: [0, 0, 0],
        halign: 'center',
        valign: 'middle'
      },
      headStyles: { 
        fillColor: [255, 255, 255], 
        textColor: [0, 0, 0], 
        fontStyle: 'bold',
        halign: 'center'
      },
      bodyStyles: {
        halign: 'left'
      },
      columnStyles: {
        0: { cellWidth: 46.25 },
        1: { cellWidth: 46.25 },
        2: { cellWidth: 46.25 },
        3: { cellWidth: 46.25 }
      },
      margin: { left: 25, right: 10 }
    });
    
    // Note below approval table
    doc.setFontSize(6);
    doc.setFont("helvetica", 'normal');
    // @ts-expect-error - lastAutoTable is added by jspdf-autotable plugin
    doc.text("*Diisi dengan tanda ceklis (✓)", 10, doc.lastAutoTable.finalY + 3);
    
    // Footer message
    doc.setFontSize(8);
    doc.setFont("helvetica", 'bold');
    doc.text(
      "NICE PROGRESS, TERIMA KASIH YA!! KAMI TUNGGU GEBRAKAN ANDA SELANJUTNYA",
      105,
      287,
      { align: 'center' }
    );
    
    // ============================================
    // PAGE 2: KRITERIA PENILAIAN SS
    // ============================================
    doc.addPage();
    
    // Header for page 2
    doc.setFontSize(11);
    doc.setFont("helvetica", 'bold');
    doc.text("KRITERIA PENILAIAN SS - PT BATARA DHARMA PERSADA", 105, 12, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont("helvetica", 'normal');
    doc.text(`No. Form : ${suggestion.noRegistSS || "01/ SS-PDCA/IX/2025"}`, 105, 18, { align: 'center' });
    
    let yPos2 = 25;
    
    // Kriteria Penilaian table structure
    const kriteriaPenilaianData = [
      {
        id: 1,
        nama: "Kualitas",
        scores: {
          0: "Tdk ada",
          1: "Peningkatan kualitas kerja di tempat kerja pengusul SS",
          2: "Adanya peningkatan kualitas kerja di tempat kerja pengusul SS dan kualitas kerja proses sesudahnya atau sebelumnya",
          3: "Peningkatan kualitas produk (hasil kerja) dan meningkatkan image perusahaan"
        }
      },
      {
        id: 2,
        nama: "Reduksi biaya",
        scores: {
          0: "Tdk ada",
          1: "Terdapat Reduksi Biaya"
        }
      },
      {
        id: 3,
        nama: "Delivery",
        scores: {
          0: "Tdk ada",
          1: "Memperlancar proses kerja pengusul SS",
          2: "Menjamin delivery hasil kerja yang tepat waktu pada proses berikutnya.",
          3: "Menjamin delivery hasil kerja yang tepat waktu pada setiap proses."
        }
      },
      {
        id: 4,
        nama: "Safety, Health & Env.",
        scores: {
          0: "Tdk ada",
          1: "Menjadi lebih aman dari sebelumnya",
          2: "Mencegah kecelakaan karena kecerobohan",
          3: "Mencegah kecelakaan sekalipun sudah berhati-hati / tidak ceroboh",
          4: "Dalam kondisi apapun kecelakaan bisa dicegah / tidak ada"
        }
      },
      {
        id: 5,
        nama: "Manfaat",
        scores: {
          0: "Tdk ada",
          1: "Hanya dapat digunakan untuk dirinya / prosesnya sendiri.",
          2: "Dapat dimanfaatkan oleh rekan kerja lain dalam satu bagian",
          3: "Dapat dimanfaatkan oleh semua bagian atau site."
        }
      },
      {
        id: 6,
        nama: "Keaslian Ide",
        scores: {
          0: "Tdk ada",
          1: "Ide sederhana dan hampir sama, dapat ditemukan di tempat lain.",
          2: "Modifikasi dari alat atau methode yang sudah ada",
          3: "Kombinasi dari beberapa ide, tapi ada penyempurnaan dari idenya sendiri",
          4: "Merupakan ide yang baru, kreatif dan inovatif"
        }
      },
      {
        id: 7,
        nama: "Kepekaan",
        scores: {
          0: "Tdk ada",
          1: "Memperbaiki atas saran / keluhan orang lain",
          2: "Inisiatif sendiri pada masalah sendiri yang sudah parah",
          3: "Memperbaiki hal-hal penting yang tidak diperhatikan orang lain"
        }
      },
      {
        id: 8,
        nama: "Perencanaan",
        scores: {
          0: "Tdk ada",
          1: "Perencanaan sederhana tanpa analisa data",
          2: "Perencanaan dengan analisa data"
        }
      },
      {
        id: 9,
        nama: "Pelaksanaan Ide",
        scores: {
          0: "Tdk ada",
          1: "Dapat direalisir dengan mudah tanpa persiapan khusus",
          2: "Perlu persiapan khusus untuk merealisasikan perbaikan",
          3: "Perlu kesungguhan dan melibatkan bagian lain untuk merealisasikan perbaikan",
          4: "Perlu perhitungan teknis dan persetujuan pihak lain atau pemenuhan terhadap persyaratan standar"
        }
      },
      {
        id: 10,
        nama: "Sumber Daya",
        scores: {
          0: "Tdk ada",
          1: "Menggunakan sumber daya yang baru",
          2: "Sebagian menggunakan sumber daya yang ada",
          3: "Seluruhnya menggunakan sumber daya yang ada"
        }
      }
    ];
    
    // Build table rows
    const tableBody: any[] = [];
    kriteriaPenilaianData.forEach((item) => {
      const penilaianItem = suggestion.penilaian?.find(p => {
        const penilaianKriteriaLower = (p.penilaianKriteria || "").toLowerCase();
        const kriteriaNamaLower = item.nama.toLowerCase();
        return penilaianKriteriaLower.includes(kriteriaNamaLower.split(" ")[0]);
      });
      
      const score = penilaianItem?.skorKriteria || 0;
      
      // Create score cells with descriptions
      const scoreDescriptions: string[] = [];
      Object.entries(item.scores).forEach(([scoreVal, desc]) => {
        scoreDescriptions.push(`${scoreVal} ${desc}`);
      });
      
      tableBody.push([
        { content: item.id.toString(), styles: { halign: 'center' as const, valign: 'middle' as const, fontStyle: 'bold' as const } },
        { content: item.nama + "\n" + scoreDescriptions.join("\n"), styles: { halign: 'left' as const, fontSize: 6 } },
        { content: "Nilai", styles: { halign: 'center' as const, fontStyle: 'bold' as const } },
        { content: score > 0 ? score.toString() : "", styles: { halign: 'center' as const } },
        { content: score > 0 ? score.toString() : "", styles: { halign: 'center' as const } }
      ]);
    });
    
    // Main evaluation table
    autoTable(doc, {
      startY: yPos2,
      head: [["", "HASIL IDE USAHA", "NILAI", "Supervisor", "Dept. Head / PM"]],
      body: tableBody,
      theme: 'grid',
      styles: { 
        fontSize: 7, 
        cellPadding: 2,
        lineWidth: 0.1,
        lineColor: [0, 0, 0],
        textColor: [0, 0, 0],
        valign: 'middle'
      },
      headStyles: { 
        fillColor: [255, 255, 255], 
        textColor: [0, 0, 0], 
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle'
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 125, halign: 'left' },
        2: { cellWidth: 15, halign: 'center' },
        3: { cellWidth: 20, halign: 'center' },
        4: { cellWidth: 20, halign: 'center' }
      },
      margin: { left: 10, right: 10 }
    });
    
    // @ts-expect-error - lastAutoTable is added by jspdf-autotable plugin
    yPos2 = doc.lastAutoTable.finalY + 3;
    
    // Total Score row
    const totalScorePage2 = calculateTotalScore(suggestion);
    autoTable(doc, {
      startY: yPos2,
      body: [
        [
          { content: "T O T A L", styles: { fontStyle: 'bold' as const, halign: 'center' as const } },
          { content: "N I L A I", styles: { fontStyle: 'bold' as const, halign: 'center' as const } },
          { content: totalScorePage2 > 0 ? totalScorePage2.toString() : "", styles: { halign: 'center' as const } },
          { content: "P A R A F", styles: { fontStyle: 'bold' as const, halign: 'center' as const } }
        ]
      ],
      theme: 'grid',
      styles: { 
        fontSize: 7, 
        cellPadding: 2,
        lineWidth: 0.1,
        lineColor: [0, 0, 0],
        textColor: [0, 0, 0],
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 140 },
        2: { cellWidth: 20 },
        3: { cellWidth: 20 }
      },
      margin: { left: 10, right: 10 }
    });
    
    // @ts-expect-error - lastAutoTable is added by jspdf-autotable plugin
    yPos2 = doc.lastAutoTable.finalY + 6;
    
    // Klasifikasi Penilaian table
    autoTable(doc, {
      startY: yPos2,
      head: [["KLASIFIKASI PENILAIAN"]],
      body: [
        [{ content: "", styles: { minCellHeight: 0, cellPadding: 0 } }]
      ],
      theme: 'grid',
      styles: { 
        fontSize: 8, 
        cellPadding: 2,
        lineWidth: 0.1,
        lineColor: [0, 0, 0],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        halign: 'center'
      },
      headStyles: { 
        fillColor: [255, 255, 255], 
        textColor: [0, 0, 0], 
        fontStyle: 'bold',
        halign: 'center'
      },
      margin: { left: 10, right: 10 }
    });
    
    // @ts-expect-error - lastAutoTable is added by jspdf-autotable plugin
    yPos2 = doc.lastAutoTable.finalY;
    
    // Nilai and Kelas rows
    autoTable(doc, {
      startY: yPos2,
      body: [
        [
          { content: "N I L A I", styles: { fontStyle: 'bold' as const, halign: 'center' as const } },
          ...klasifikasiPenilaian.map(k => ({ content: k.nilai, styles: { halign: 'center' as const } }))
        ],
        [
          { content: "K E L A S", styles: { fontStyle: 'bold' as const, halign: 'center' as const } },
          ...klasifikasiPenilaian.map(k => ({ content: k.kelas, styles: { halign: 'center' as const } }))
        ]
      ],
      theme: 'grid',
      styles: { 
        fontSize: 7, 
        cellPadding: 2,
        lineWidth: 0.1,
        lineColor: [0, 0, 0],
        textColor: [0, 0, 0]
      },
      columnStyles: {
        0: { cellWidth: 20, fontStyle: 'bold' }
      },
      margin: { left: 10, right: 10 }
    });
    
    // @ts-expect-error - lastAutoTable is added by jspdf-autotable plugin
    yPos2 = doc.lastAutoTable.finalY + 8;
    
    // Aliran Penilaian Suggestion System
    doc.setFontSize(9);
    doc.setFont("helvetica", 'bold');
    doc.text("ALIRAN PENILAIAN SUGGESTION SYSTEM", 105, yPos2, { align: 'center' });
    yPos2 += 6;
    
    // Create 4-column table for process flow
    autoTable(doc, {
      startY: yPos2,
      head: [["PEMBUAT SS", "ATASAN LANGSUNG", "SPV/ dan DEPT HEAD/PM", "TEAM SS"]],
      body: [
        [
          "- Perhatikan ketentuan pembuatan SS\n" +
          "- Isi form SS dengan lengkap dan jelas\n" +
          "- Lengkapi dengan gambar / ilustrasi dan perhitungan hasil perbaikan (penurunan cost, man hour, dll)\n" +
          "- Tuliskan manfaat SS anda selengkap dalam format QCDSMP\n" +
          "- SS diajukan ke atasan langsung untuk diperiksa sebelum dinilai oleh SPV/Dept Head/Manager",
          
          "- Teliti keaslian ide (SS) yang diajukan\n" +
          "- Periksa perbaikan yang dilakukan\n" +
          "- Lakukan koreksi bila perlu\n" +
          "- Berikan komentar atas ide (SS) tersebut\n" +
          "- Teruskan ke SPV/Dept Head untuk dinilai",
          
          "- Periksa perbaikan yang dilakukan\n" +
          "- Lakukan penilaian sesuai dengan Kriteria Penilaian SS di atas\n" +
          "- Menyerahkan hasil penilaian ke Team SS",
          
          "- Mendata SS yg masuk & memberi nomor registrasi"
        ]
      ],
      theme: 'grid',
      styles: { 
        fontSize: 6, 
        cellPadding: 3,
        lineWidth: 0.1,
        lineColor: [0, 0, 0],
        textColor: [0, 0, 0],
        valign: 'top'
      },
      headStyles: { 
        fillColor: [255, 255, 255], 
        textColor: [0, 0, 0], 
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle'
      },
      bodyStyles: {
        halign: 'left'
      },
      columnStyles: {
        0: { cellWidth: 47.5 },
        1: { cellWidth: 47.5 },
        2: { cellWidth: 47.5 },
        3: { cellWidth: 47.5 }
      },
      margin: { left: 10, right: 10 }
    });
    
    const fileName = `SS_${suggestion.noRegistSS || suggestion.id}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    
    showSuccess("Suggestion exported to PDF successfully!");
  } catch (err) {
    console.error("PDF export error:", err);
    showError(err instanceof Error ? err.message : "Failed to export to PDF");
  }
};