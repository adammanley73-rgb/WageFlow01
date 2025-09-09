import jsPDF from "jspdf";

export type PayslipData = {
  employee: {
    name: string;
    employeeNumber: string;
    email: string;
    address?: string;
    niNumber?: string;
  };
  company: {
    name: string;
    address: string;
    payeRef?: string;
  };
  payPeriod: {
    startDate: string;
    endDate: string;
    payDate: string;
    frequency: string;
  };
  earnings: {
    basicPay: number;
    overtime: number;
    bonus: number;
    gross: number;
  };
  deductions: {
    incomeTax: number;
    nationalInsurance: number;
    pensionEmployee: number;
    other?: number;
    total: number;
  };
  netPay: number;
  yearToDate: {
    grossPay: number;
    incomeTax: number;
    nationalInsurance: number;
    pensionEmployee: number;
    netPay: number;
  };
  payslipNumber: string;
  taxCode?: string;
};

export class PayslipGenerator {
  private static formatCurrency(amount: number): string {
    return `£${amount.toFixed(2)}`;
  }

  private static formatDate(dateStr: string): string {
    try {
      const date = new Date(
        dateStr.includes("T") ? dateStr : `${dateStr}T12:00:00.000Z`
      );
      return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  }

  static generatePayslip(data: PayslipData): jsPDF {
    const doc = new jsPDF();

    // Header
    doc.setFillColor(16, 185, 129);
    doc.rect(0, 0, 210, 30, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("WageFlow", 15, 20);

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("PAYSLIP", 160, 20);

    // Body
    doc.setTextColor(0, 0, 0);

    let currentY = 45;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Company Details:", 15, currentY);

    doc.setFont("helvetica", "normal");
    doc.text(data.company.name, 15, currentY + 7);

    const companyAddress = data.company.address.split("\n");
    let addressY = currentY + 12;
    companyAddress.forEach((line) => {
      doc.text(line, 15, addressY);
      addressY += 5;
    });

    if (data.company.payeRef) {
      doc.text(`PAYE Ref: ${data.company.payeRef}`, 15, addressY + 3);
    }

    // Employee details
    doc.setFont("helvetica", "bold");
    doc.text("Employee Details:", 110, currentY);

    doc.setFont("helvetica", "normal");
    doc.text(data.employee.name, 110, currentY + 7);
    doc.text(`Employee No: ${data.employee.employeeNumber}`, 110, currentY + 12);
    if (data.employee.niNumber) {
      doc.text(`NI Number: ${data.employee.niNumber}`, 110, currentY + 17);
    }
    if (data.taxCode) {
      doc.text(`Tax Code: ${data.taxCode}`, 110, currentY + 22);
    }

    // Payslip details
    currentY = 85;
    doc.setFont("helvetica", "bold");
    doc.text("Payslip Details:", 15, currentY);

    doc.setFont("helvetica", "normal");
    doc.text(`Payslip Number: ${data.payslipNumber}`, 15, currentY + 7);
    doc.text(
      `Pay Frequency: ${data.payPeriod.frequency.toUpperCase()}`,
      15,
      currentY + 12
    );
    doc.text(
      `Pay Period: ${this.formatDate(data.payPeriod.startDate)} - ${this.formatDate(
        data.payPeriod.endDate
      )}`,
      15,
      currentY + 17
    );
    doc.text(
      `Payment Date: ${this.formatDate(data.payPeriod.payDate)}`,
      15,
      currentY + 22
    );

    // Table
    const tableStartY = 120;

    doc.setFillColor(248, 250, 252);
    doc.rect(15, tableStartY, 180, 10, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("GROSS PAY ELEMENTS", 20, tableStartY + 6);
    doc.text("YTD FIGURES", 75, tableStartY + 6);
    doc.text("DEDUCTIONS", 130, tableStartY + 6);
    doc.text("AMOUNT", 170, tableStartY + 6);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    // Left column (earnings)
    let leftColumnY = tableStartY + 20;

    doc.text("Basic Pay", 20, leftColumnY);
    doc.text(this.formatCurrency(data.earnings.basicPay), 60, leftColumnY);
    doc.text(this.formatCurrency(data.yearToDate.grossPay), 75, leftColumnY);
    leftColumnY += 8;

    if (data.earnings.overtime > 0) {
      doc.text("Overtime", 20, leftColumnY);
      doc.text(this.formatCurrency(data.earnings.overtime), 60, leftColumnY);
      leftColumnY += 8;
    }

    if (data.earnings.bonus > 0) {
      doc.text("Bonus", 20, leftColumnY);
      doc.text(this.formatCurrency(data.earnings.bonus), 60, leftColumnY);
      leftColumnY += 8;
    }

    leftColumnY += 3;
    doc.setLineWidth(0.5);
    doc.line(20, leftColumnY, 65, leftColumnY);
    leftColumnY += 8;

    doc.setFont("helvetica", "bold");
    doc.text("TOTAL GROSS PAY", 20, leftColumnY);
    doc.text(this.formatCurrency(data.earnings.gross), 60, leftColumnY);
    doc.text(this.formatCurrency(data.yearToDate.grossPay), 75, leftColumnY);

    // Right column (deductions)
    let deductionsY = tableStartY + 20;
    doc.setFont("helvetica", "normal");

    doc.text("Income Tax", 130, deductionsY);
    doc.text(this.formatCurrency(data.deductions.incomeTax), 170, deductionsY);
    deductionsY += 8;

    doc.text("National Insurance", 130, deductionsY);
    doc.text(
      this.formatCurrency(data.deductions.nationalInsurance),
      170,
      deductionsY
    );
    deductionsY += 8;

    doc.text("Pension (Employee)", 130, deductionsY);
    doc.text(
      this.formatCurrency(data.deductions.pensionEmployee),
      170,
      deductionsY
    );
    deductionsY += 8;

    if (data.deductions.other && data.deductions.other > 0) {
      doc.text("Other Deductions", 130, deductionsY);
      doc.text(this.formatCurrency(data.deductions.other), 170, deductionsY);
      deductionsY += 8;
    }

    deductionsY += 3;
    doc.line(130, deductionsY, 185, deductionsY);
    deductionsY += 8;

    doc.setFont("helvetica", "bold");
    doc.text("TOTAL DEDUCTIONS", 130, deductionsY);
    doc.text(this.formatCurrency(data.deductions.total), 170, deductionsY);

    // Net Pay highlight
    const netPayY = Math.max(leftColumnY, deductionsY) + 20;

    doc.setFillColor(16, 185, 129);
    doc.rect(15, netPayY, 180, 15, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("NET PAY (TAKE HOME)", 20, netPayY + 10);
    doc.text(this.formatCurrency(data.netPay), 150, netPayY + 10);

    // YTD Summary
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("YEAR TO DATE SUMMARY", 15, netPayY + 35);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const ytdStartY = netPayY + 45;

    doc.text("Gross Pay:", 20, ytdStartY);
    doc.text(this.formatCurrency(data.yearToDate.grossPay), 70, ytdStartY);

    doc.text("Income Tax:", 20, ytdStartY + 8);
    doc.text(this.formatCurrency(data.yearToDate.incomeTax), 70, ytdStartY + 8);

    doc.text("National Insurance:", 20, ytdStartY + 16);
    doc.text(
      this.formatCurrency(data.yearToDate.nationalInsurance),
      70,
      ytdStartY + 16
    );

    doc.text("Pension:", 20, ytdStartY + 24);
    doc.text(
      this.formatCurrency(data.yearToDate.pensionEmployee),
      70,
      ytdStartY + 24
    );

    doc.setFont("helvetica", "bold");
    doc.text("YTD Net Pay:", 20, ytdStartY + 35);
    doc.text(this.formatCurrency(data.yearToDate.netPay), 70, ytdStartY + 35);

    // Footer
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(
      "This is a computer-generated payslip and does not require a signature.",
      15,
      270
    );
    doc.text(
      "For payroll queries, please contact: payroll@yourcompany.com",
      15,
      275
    );

    return doc;
  }

  static async generateBulkPayslips(payrollRunData: PayslipData[]): Promise<Blob> {
    // Dynamic import keeps client bundle happy
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();

    for (const data of payrollRunData) {
      const pdf = this.generatePayslip(data);
      const pdfBlob = pdf.output("blob");
      zip.file(`${data.employee.employeeNumber}_${data.payslipNumber}.pdf`, pdfBlob);
    }

    return zip.generateAsync({ type: "blob" });
  }
}
