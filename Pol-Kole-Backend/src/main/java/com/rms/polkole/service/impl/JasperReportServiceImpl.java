package com.rms.polkole.service.impl;

import com.rms.polkole.entity.InvoiceEntity;
import com.rms.polkole.entity.InvoiceItemEntity;
import com.rms.polkole.repository.InvoiceRepository;
import com.rms.polkole.service.JasperReportService;
import lombok.RequiredArgsConstructor;
import net.sf.jasperreports.engine.*;
import net.sf.jasperreports.engine.data.JRBeanCollectionDataSource;
import net.sf.jasperreports.engine.design.JasperDesign;
import net.sf.jasperreports.engine.xml.JRXmlLoader;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Service
@RequiredArgsConstructor
public class JasperReportServiceImpl implements JasperReportService {

    private final InvoiceRepository invoiceRepository;

    @Override
    @Transactional(readOnly = true)
    public byte[] generateInvoicePdf(Integer invoiceId) {
        InvoiceEntity invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Invoice not found with ID: " + invoiceId));

        try {
            // Define parameters
            Map<String, Object> parameters = new HashMap<>();
            parameters.put("restaurantName", "Pol-Kole Royal Restaurant & Lounge");
            parameters.put("invoiceNumber", invoice.getInvoiceNumber());
            parameters.put("customerName", invoice.getOrder().getCustomer() != null ? invoice.getOrder().getCustomer().getName() : "Walk-in Guest");
            parameters.put("customerPassport", invoice.getOrder().getCustomer() != null ? invoice.getOrder().getCustomer().getPhone() : "N/A");
            parameters.put("tableNumber", invoice.getOrder().getTable() != null ? invoice.getOrder().getTable().getTableNumber() : "Takeaway / Delivery");
            parameters.put("roomCharges", invoice.getOrderSubtotal()); // Map roomCharges param to orderSubtotal for matching layout
            parameters.put("taxAmount", invoice.getTaxAmount());
            parameters.put("discountAmount", invoice.getDiscountAmount());
            parameters.put("totalAmount", invoice.getTotalAmount());
            parameters.put("paymentStatus", invoice.getPaymentStatus());
            parameters.put("stayDates", invoice.getOrder().getOrderTime().toString());

            // Compile dynamic JRXML
            String jrxml = getInvoiceJrxmlTemplate();
            ByteArrayInputStream is = new ByteArrayInputStream(jrxml.getBytes(StandardCharsets.UTF_8));
            JasperDesign jasperDesign = JRXmlLoader.load(is);
            JasperReport jasperReport = JasperCompileManager.compileReport(jasperDesign);

            // Data Source mapping
            List<Map<String, Object>> itemsList = new ArrayList<>();
            for (InvoiceItemEntity item : invoice.getItems()) {
                Map<String, Object> map = new HashMap<>();
                map.put("description", item.getDescription());
                map.put("quantity", item.getQuantity());
                map.put("unitPrice", item.getUnitPrice());
                map.put("totalPrice", item.getTotalPrice());
                itemsList.add(map);
            }

            JRBeanCollectionDataSource dataSource = new JRBeanCollectionDataSource(itemsList);
            JasperPrint jasperPrint = JasperFillManager.fillReport(jasperReport, parameters, dataSource);

            return JasperExportManager.exportReportToPdf(jasperPrint);
        } catch (Exception e) {
            e.printStackTrace();
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Error generating PDF invoice: " + e.getMessage());
        }
    }

    private String getInvoiceJrxmlTemplate() {
        return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" +
                "<jasperReport xmlns=\"http://jasperreports.sourceforge.net/jasperreports\" \n" +
                "              xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" \n" +
                "              xsi:schemaLocation=\"http://jasperreports.sourceforge.net/jasperreports http://jasperreports.sourceforge.net/xsd/jasperreport.xsd\" \n" +
                "              name=\"InvoiceReport\" pageWidth=\"595\" pageHeight=\"842\" columnWidth=\"555\" leftMargin=\"20\" rightMargin=\"20\" topMargin=\"20\" bottomMargin=\"20\">\n" +
                "    <parameter name=\"restaurantName\" class=\"java.lang.String\"/>\n" +
                "    <parameter name=\"invoiceNumber\" class=\"java.lang.String\"/>\n" +
                "    <parameter name=\"customerName\" class=\"java.lang.String\"/>\n" +
                "    <parameter name=\"customerPassport\" class=\"java.lang.String\"/>\n" +
                "    <parameter name=\"tableNumber\" class=\"java.lang.String\"/>\n" +
                "    <parameter name=\"roomCharges\" class=\"java.math.BigDecimal\"/>\n" +
                "    <parameter name=\"taxAmount\" class=\"java.math.BigDecimal\"/>\n" +
                "    <parameter name=\"discountAmount\" class=\"java.math.BigDecimal\"/>\n" +
                "    <parameter name=\"totalAmount\" class=\"java.math.BigDecimal\"/>\n" +
                "    <parameter name=\"paymentStatus\" class=\"java.lang.String\"/>\n" +
                "    <parameter name=\"stayDates\" class=\"java.lang.String\"/>\n" +
                "    <field name=\"description\" class=\"java.lang.String\"/>\n" +
                "    <field name=\"quantity\" class=\"java.lang.Integer\"/>\n" +
                "    <field name=\"unitPrice\" class=\"java.math.BigDecimal\"/>\n" +
                "    <field name=\"totalPrice\" class=\"java.math.BigDecimal\"/>\n" +
                "    <title>\n" +
                "        <band height=\"120\">\n" +
                "            <staticText>\n" +
                "                <reportElement x=\"0\" y=\"0\" width=\"280\" height=\"35\"/>\n" +
                "                <textElement>\n" +
                "                    <font size=\"22\" isBold=\"true\"/>\n" +
                "                </textElement>\n" +
                "                <text><![CDATA[Pol-Kole Royal Restaurant]]></text>\n" +
                "            </staticText>\n" +
                "            <textField>\n" +
                "                <reportElement x=\"400\" y=\"0\" width=\"155\" height=\"20\"/>\n" +
                "                <textElement textAlignment=\"Right\">\n" +
                "                    <font size=\"12\" isBold=\"true\"/>\n" +
                "                </textElement>\n" +
                "                <textFieldExpression><![CDATA[\"INVOICE: \" + $P{invoiceNumber}]]></textFieldExpression>\n" +
                "            </textField>\n" +
                "            <staticText>\n" +
                "                <reportElement x=\"0\" y=\"50\" width=\"100\" height=\"15\"/>\n" +
                "                <textElement><font isBold=\"true\"/></textElement>\n" +
                "                <text><![CDATA[CUSTOMER DETAIL:]]></text>\n" +
                "            </staticText>\n" +
                "            <textField>\n" +
                "                <reportElement x=\"0\" y=\"65\" width=\"250\" height=\"15\"/>\n" +
                "                <textFieldExpression><![CDATA[\"Name: \" + $P{customerName}]]></textFieldExpression>\n" +
                "            </textField>\n" +
                "            <textField>\n" +
                "                <reportElement x=\"0\" y=\"80\" width=\"250\" height=\"15\"/>\n" +
                "                <textFieldExpression><![CDATA[\"Contact: \" + $P{customerPassport}]]></textFieldExpression>\n" +
                "            </textField>\n" +
                "            <staticText>\n" +
                "                <reportElement x=\"320\" y=\"50\" width=\"100\" height=\"15\"/>\n" +
                "                <textElement><font isBold=\"true\"/></textElement>\n" +
                "                <text><![CDATA[ORDER DETAIL:]]></text>\n" +
                "            </staticText>\n" +
                "            <textField>\n" +
                "                <reportElement x=\"320\" y=\"65\" width=\"235\" height=\"15\"/>\n" +
                "                <textFieldExpression><![CDATA[\"Table Number: \" + $P{tableNumber}]]></textFieldExpression>\n" +
                "            </textField>\n" +
                "            <textField>\n" +
                "                <reportElement x=\"320\" y=\"80\" width=\"235\" height=\"15\"/>\n" +
                "                <textFieldExpression><![CDATA[\"Order Time: \" + $P{stayDates}]]></textFieldExpression>\n" +
                "            </textField>\n" +
                "            <line>\n" +
                "                <reportElement x=\"0\" y=\"110\" width=\"555\" height=\"1\"/>\n" +
                "            </line>\n" +
                "        </band>\n" +
                "    </title>\n" +
                "    <columnHeader>\n" +
                "        <band height=\"25\">\n" +
                "            <staticText>\n" +
                "                <reportElement x=\"0\" y=\"0\" width=\"280\" height=\"20\"/>\n" +
                "                <textElement><font size=\"11\" isBold=\"true\"/></textElement>\n" +
                "                <text><![CDATA[Description]]></text>\n" +
                "            </staticText>\n" +
                "            <staticText>\n" +
                "                <reportElement x=\"280\" y=\"0\" width=\"70\" height=\"20\"/>\n" +
                "                <textElement textAlignment=\"Center\"><font size=\"11\" isBold=\"true\"/></textElement>\n" +
                "                <text><![CDATA[Qty]]></text>\n" +
                "            </staticText>\n" +
                "            <staticText>\n" +
                "                <reportElement x=\"350\" y=\"0\" width=\"100\" height=\"20\"/>\n" +
                "                <textElement textAlignment=\"Right\"><font size=\"11\" isBold=\"true\"/></textElement>\n" +
                "                <text><![CDATA[Unit Price]]></text>\n" +
                "            </staticText>\n" +
                "            <staticText>\n" +
                "                <reportElement x=\"450\" y=\"0\" width=\"105\" height=\"20\"/>\n" +
                "                <textElement textAlignment=\"Right\"><font size=\"11\" isBold=\"true\"/></textElement>\n" +
                "                <text><![CDATA[Total Price]]></text>\n" +
                "            </staticText>\n" +
                "            <line>\n" +
                "                <reportElement x=\"0\" y=\"20\" width=\"555\" height=\"1\"/>\n" +
                "            </line>\n" +
                "        </band>\n" +
                "    </columnHeader>\n" +
                "    <detail>\n" +
                "        <band height=\"25\">\n" +
                "            <textField>\n" +
                "                <reportElement x=\"0\" y=\"5\" width=\"280\" height=\"15\"/>\n" +
                "                <textFieldExpression><![CDATA[$F{description}]]></textFieldExpression>\n" +
                "            </textField>\n" +
                "            <textField>\n" +
                "                <reportElement x=\"280\" y=\"5\" width=\"70\" height=\"15\"/>\n" +
                "                <textElement textAlignment=\"Center\"/>\n" +
                "                <textFieldExpression><![CDATA[$F{quantity}]]></textFieldExpression>\n" +
                "            </textField>\n" +
                "            <textField>\n" +
                "                <reportElement x=\"350\" y=\"5\" width=\"100\" height=\"15\"/>\n" +
                "                <textElement textAlignment=\"Right\"/>\n" +
                "                <textFieldExpression><![CDATA[\"$\" + $F{unitPrice}]]></textFieldExpression>\n" +
                "            </textField>\n" +
                "            <textField>\n" +
                "                <reportElement x=\"450\" y=\"5\" width=\"105\" height=\"15\"/>\n" +
                "                <textElement textAlignment=\"Right\"/>\n" +
                "                <textFieldExpression><![CDATA[\"$\" + $F{totalPrice}]]></textFieldExpression>\n" +
                "            </textField>\n" +
                "        </band>\n" +
                "    </detail>\n" +
                "    <summary>\n" +
                "        <band height=\"150\">\n" +
                "            <line>\n" +
                "                <reportElement x=\"0\" y=\"5\" width=\"555\" height=\"1\"/>\n" +
                "            </line>\n" +
                "            <staticText>\n" +
                "                <reportElement x=\"320\" y=\"15\" width=\"120\" height=\"15\"/>\n" +
                "                <textElement textAlignment=\"Right\"><font isBold=\"true\"/></textElement>\n" +
                "                <text><![CDATA[Subtotal Amount:]]></text>\n" +
                "            </staticText>\n" +
                "            <textField>\n" +
                "                <reportElement x=\"450\" y=\"15\" width=\"105\" height=\"15\"/>\n" +
                "                <textElement textAlignment=\"Right\"/>\n" +
                "                <textFieldExpression><![CDATA[\"$\" + $P{roomCharges}]]></textFieldExpression>\n" +
                "            </textField>\n" +
                "            <staticText>\n" +
                "                <reportElement x=\"320\" y=\"35\" width=\"120\" height=\"15\"/>\n" +
                "                <textElement textAlignment=\"Right\"><font isBold=\"true\"/></textElement>\n" +
                "                <text><![CDATA[Discount Amount:]]></text>\n" +
                "            </staticText>\n" +
                "            <textField>\n" +
                "                <reportElement x=\"450\" y=\"35\" width=\"105\" height=\"15\"/>\n" +
                "                <textElement textAlignment=\"Right\"/>\n" +
                "                <textFieldExpression><![CDATA[\"-$\" + $P{discountAmount}]]></textFieldExpression>\n" +
                "            </textField>\n" +
                "            <staticText>\n" +
                "                <reportElement x=\"320\" y=\"55\" width=\"120\" height=\"15\"/>\n" +
                "                <textElement textAlignment=\"Right\"><font isBold=\"true\"/></textElement>\n" +
                "                <text><![CDATA[Tax Aggregations:]]></text>\n" +
                "            </staticText>\n" +
                "            <textField>\n" +
                "                <reportElement x=\"450\" y=\"55\" width=\"105\" height=\"15\"/>\n" +
                "                <textElement textAlignment=\"Right\"/>\n" +
                "                <textFieldExpression><![CDATA[\"$\" + $P{taxAmount}]]></textFieldExpression>\n" +
                "            </textField>\n" +
                "            <staticText>\n" +
                "                <reportElement x=\"320\" y=\"75\" width=\"120\" height=\"20\"/>\n" +
                "                <textElement textAlignment=\"Right\">\n" +
                "                    <font size=\"12\" isBold=\"true\"/>\n" +
                "                </textElement>\n" +
                "                <text><![CDATA[TOTAL CHARGES:]]></text>\n" +
                "            </staticText>\n" +
                "            <textField>\n" +
                "                <reportElement x=\"450\" y=\"75\" width=\"105\" height=\"20\"/>\n" +
                "                <textElement textAlignment=\"Right\">\n" +
                "                    <font size=\"12\" isBold=\"true\"/>\n" +
                "                </textElement>\n" +
                "                <textFieldExpression><![CDATA[\"$\" + $P{totalAmount}]]></textFieldExpression>\n" +
                "            </textField>\n" +
                "            <textField>\n" +
                "                <reportElement x=\"0\" y=\"105\" width=\"250\" height=\"25\"/>\n" +
                "                <textElement>\n" +
                "                    <font size=\"14\" isBold=\"true\"/>\n" +
                "                </textElement>\n" +
                "                <textFieldExpression><![CDATA[\"STATUS: \" + $P{paymentStatus}]]></textFieldExpression>\n" +
                "            </textField>\n" +
                "            <staticText>\n" +
                "                <reportElement x=\"0\" y=\"130\" width=\"555\" height=\"15\"/>\n" +
                "                <textElement textAlignment=\"Center\">\n" +
                "                    <font size=\"8\" isItalic=\"true\"/>\n" +
                "                </textElement>\n" +
                "                <text><![CDATA[Thank you for dining at Pol-Kole Royal Restaurant & Lounge. See you again soon!]]></text>\n" +
                "            </staticText>\n" +
                "        </band>\n" +
                "    </summary>\n" +
                "</jasperReport>";
    }
}
