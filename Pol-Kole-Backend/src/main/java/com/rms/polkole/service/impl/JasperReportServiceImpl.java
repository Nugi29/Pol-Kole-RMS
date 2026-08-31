package com.rms.polkole.service.impl;

import com.rms.polkole.entity.InvoiceEntity;
import com.rms.polkole.entity.InvoiceItemEntity;
import com.rms.polkole.repository.InvoiceRepository;
import com.rms.polkole.service.RestaurantSettingsService;
import com.rms.polkole.dto.RestaurantSettingsDto;
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
    private final RestaurantSettingsService settingsService;

    @Override
    @Transactional(readOnly = true)
    public byte[] generateInvoicePdf(Integer invoiceId) {
        InvoiceEntity invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Invoice not found with ID: " + invoiceId));

        try {
            // Define parameters
            RestaurantSettingsDto settings = settingsService.getSettings();
            Map<String, Object> parameters = new HashMap<>();
            String restName = settings != null && settings.getRestaurantFullName() != null ? settings.getRestaurantFullName() : "Pol Kole Restaurant & Resort";
            String tagline = settings != null && settings.getTagline() != null ? settings.getTagline() : "DINE • STAY • ENJOY • FEELS LIKE HOME";
            String address = settings != null && settings.getAddress() != null ? settings.getAddress() : "Galle Road, Ahangama, Southern Province, Sri Lanka";
            String hotlinePhone = "Hotline: " + (settings != null && settings.getHotlinePhoneNumber() != null ? settings.getHotlinePhoneNumber() : "0777 222 222") + " | Phone: " + (settings != null && settings.getPhoneNumber() != null ? settings.getPhoneNumber() : "+94 91 228 3456");
            String contactWeb = "Email: " + (settings != null && settings.getEmail() != null ? settings.getEmail() : "info@pk.lk") + " | Web: " + (settings != null && settings.getWebsite() != null ? settings.getWebsite() : "www.polkole.lk") + " • BRN: " + (settings != null && settings.getTaxNumber() != null ? settings.getTaxNumber() : "PV-98234-LK");

            parameters.put("restaurantName", restName);
            parameters.put("tagline", tagline);
            parameters.put("address", address);
            parameters.put("hotlinePhone", hotlinePhone);
            parameters.put("contactWeb", contactWeb);
            parameters.put("invoiceFooter", settings != null && settings.getInvoiceFooter() != null ? settings.getInvoiceFooter() : "Thank you for dining with us!");
            parameters.put("invoiceNumber", invoice.getInvoiceNumber());

            try (java.io.InputStream logoIs = getClass().getResourceAsStream("/reports/polkolelogo.png")) {
                if (logoIs != null) {
                    parameters.put("logoImage", javax.imageio.ImageIO.read(logoIs));
                }
            } catch (Exception ignored) {}

            String customerName = "Walk-in Guest";
            String customerPassport = "N/A";
            String tableNumber = "N/A";
            String stayDates = "N/A";

            if (invoice.getOrder() != null) {
                if (invoice.getOrder().getCustomer() != null) {
                    customerName = invoice.getOrder().getCustomer().getName();
                    customerPassport = invoice.getOrder().getCustomer().getPhone() != null ? invoice.getOrder().getCustomer().getPhone() : "N/A";
                }
                if (invoice.getOrder().getTable() != null) {
                    tableNumber = invoice.getOrder().getTable().getTableNumber();
                } else {
                    tableNumber = "Takeaway / Delivery";
                }
                if (invoice.getOrder().getOrderTime() != null) {
                    stayDates = invoice.getOrder().getOrderTime().toString();
                }
            } else if (invoice.getHotelReservation() != null) {
                if (invoice.getHotelReservation().getCustomer() != null) {
                    customerName = invoice.getHotelReservation().getCustomer().getName();
                    customerPassport = invoice.getHotelReservation().getCustomer().getPhone() != null ? invoice.getHotelReservation().getCustomer().getPhone() : "N/A";
                }
                if (invoice.getHotelReservation().getRoom() != null) {
                    tableNumber = "Room " + invoice.getHotelReservation().getRoom().getRoomNumber();
                }
                if (invoice.getHotelReservation().getCheckInDate() != null && invoice.getHotelReservation().getCheckOutDate() != null) {
                    stayDates = invoice.getHotelReservation().getCheckInDate().toString() + " to " + invoice.getHotelReservation().getCheckOutDate().toString();
                } else if (invoice.getHotelReservation().getCheckInDate() != null) {
                    stayDates = invoice.getHotelReservation().getCheckInDate().toString();
                }
            } else if (invoice.getTableReservation() != null) {
                if (invoice.getTableReservation().getCustomer() != null) {
                    customerName = invoice.getTableReservation().getCustomer().getName();
                    customerPassport = invoice.getTableReservation().getCustomer().getPhone() != null ? invoice.getTableReservation().getCustomer().getPhone() : "N/A";
                }
                if (invoice.getTableReservation().getTable() != null) {
                    tableNumber = invoice.getTableReservation().getTable().getTableNumber();
                }
                if (invoice.getTableReservation().getReservationDate() != null) {
                    stayDates = invoice.getTableReservation().getReservationDate().toString();
                    if (invoice.getTableReservation().getReservationTime() != null) {
                        stayDates += " " + invoice.getTableReservation().getReservationTime();
                    }
                }
            }

            parameters.put("customerName", customerName);
            parameters.put("customerPassport", customerPassport);
            parameters.put("tableNumber", tableNumber);
            parameters.put("roomCharges", invoice.getOrderSubtotal()); // Map roomCharges param to orderSubtotal for matching layout
            parameters.put("taxAmount", invoice.getTaxAmount());
            parameters.put("discountAmount", invoice.getDiscountAmount());
            parameters.put("totalAmount", invoice.getTotalAmount());
            parameters.put("paymentStatus", invoice.getPaymentStatus());
            parameters.put("stayDates", stayDates);

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
                "    <parameter name=\"logoImage\" class=\"java.awt.Image\" isForPrompting=\"false\"/>\n" +
                "    <parameter name=\"restaurantName\" class=\"java.lang.String\"/>\n" +
                "    <parameter name=\"tagline\" class=\"java.lang.String\"/>\n" +
                "    <parameter name=\"address\" class=\"java.lang.String\"/>\n" +
                "    <parameter name=\"hotlinePhone\" class=\"java.lang.String\"/>\n" +
                "    <parameter name=\"contactWeb\" class=\"java.lang.String\"/>\n" +
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
                "        <band height=\"165\">\n" +
                "            <rectangle radius=\"8\">\n" +
                "                <reportElement x=\"0\" y=\"0\" width=\"70\" height=\"70\" backcolor=\"#FDFBF7\"/>\n" +
                "                <graphicElement><pen lineWidth=\"0.5\" lineColor=\"#E2E8F0\"/></graphicElement>\n" +
                "            </rectangle>\n" +
                "            <image scaleImage=\"RetainShape\" onErrorType=\"Blank\">\n" +
                "                <reportElement x=\"3\" y=\"3\" width=\"64\" height=\"64\"/>\n" +
                "                <imageExpression><![CDATA[$P{logoImage}]]></imageExpression>\n" +
                "            </image>\n" +
                "            <textField>\n" +
                "                <reportElement x=\"80\" y=\"0\" width=\"475\" height=\"22\" forecolor=\"#004D40\"/>\n" +
                "                <textElement verticalAlignment=\"Middle\"><font size=\"16\" isBold=\"true\"/></textElement>\n" +
                "                <textFieldExpression><![CDATA[$P{restaurantName}]]></textFieldExpression>\n" +
                "            </textField>\n" +
                "            <textField>\n" +
                "                <reportElement x=\"80\" y=\"22\" width=\"475\" height=\"14\" forecolor=\"#00796B\"/>\n" +
                "                <textElement verticalAlignment=\"Middle\"><font size=\"9\" isBold=\"true\"/></textElement>\n" +
                "                <textFieldExpression><![CDATA[$P{tagline}]]></textFieldExpression>\n" +
                "            </textField>\n" +
                "            <textField>\n" +
                "                <reportElement x=\"80\" y=\"37\" width=\"475\" height=\"12\" forecolor=\"#475569\"/>\n" +
                "                <textElement verticalAlignment=\"Middle\"><font size=\"8\"/></textElement>\n" +
                "                <textFieldExpression><![CDATA[$P{address}]]></textFieldExpression>\n" +
                "            </textField>\n" +
                "            <textField>\n" +
                "                <reportElement x=\"80\" y=\"49\" width=\"475\" height=\"12\" forecolor=\"#475569\"/>\n" +
                "                <textElement verticalAlignment=\"Middle\"><font size=\"8\"/></textElement>\n" +
                "                <textFieldExpression><![CDATA[$P{hotlinePhone}]]></textFieldExpression>\n" +
                "            </textField>\n" +
                "            <textField>\n" +
                "                <reportElement x=\"80\" y=\"61\" width=\"475\" height=\"12\" forecolor=\"#475569\"/>\n" +
                "                <textElement verticalAlignment=\"Middle\"><font size=\"8\"/></textElement>\n" +
                "                <textFieldExpression><![CDATA[$P{contactWeb}]]></textFieldExpression>\n" +
                "            </textField>\n" +
                "            <line>\n" +
                "                <reportElement x=\"0\" y=\"76\" width=\"555\" height=\"3\" forecolor=\"#00695C\" backcolor=\"#00695C\"/>\n" +
                "                <graphicElement><pen lineWidth=\"2.5\" lineColor=\"#00695C\"/></graphicElement>\n" +
                "            </line>\n" +
                "            <textField>\n" +
                "                <reportElement x=\"350\" y=\"85\" width=\"205\" height=\"20\" forecolor=\"#004D40\"/>\n" +
                "                <textElement textAlignment=\"Right\">\n" +
                "                    <font size=\"13\" isBold=\"true\"/>\n" +
                "                </textElement>\n" +
                "                <textFieldExpression><![CDATA[\"INVOICE: \" + $P{invoiceNumber}]]></textFieldExpression>\n" +
                "            </textField>\n" +
                "            <staticText>\n" +
                "                <reportElement x=\"0\" y=\"85\" width=\"150\" height=\"16\"/>\n" +
                "                <textElement><font size=\"10\" isBold=\"true\"/></textElement>\n" +
                "                <text><![CDATA[CUSTOMER DETAIL:]]></text>\n" +
                "            </staticText>\n" +
                "            <textField>\n" +
                "                <reportElement x=\"0\" y=\"103\" width=\"250\" height=\"14\"/>\n" +
                "                <textFieldExpression><![CDATA[\"Name: \" + $P{customerName}]]></textFieldExpression>\n" +
                "            </textField>\n" +
                "            <textField>\n" +
                "                <reportElement x=\"0\" y=\"118\" width=\"250\" height=\"14\"/>\n" +
                "                <textFieldExpression><![CDATA[\"Contact: \" + $P{customerPassport}]]></textFieldExpression>\n" +
                "            </textField>\n" +
                "            <staticText>\n" +
                "                <reportElement x=\"320\" y=\"108\" width=\"100\" height=\"14\"/>\n" +
                "                <textElement><font isBold=\"true\"/></textElement>\n" +
                "                <text><![CDATA[ORDER DETAIL:]]></text>\n" +
                "            </staticText>\n" +
                "            <textField>\n" +
                "                <reportElement x=\"320\" y=\"123\" width=\"235\" height=\"14\"/>\n" +
                "                <textFieldExpression><![CDATA[\"Table / Room: \" + $P{tableNumber}]]></textFieldExpression>\n" +
                "            </textField>\n" +
                "            <textField>\n" +
                "                <reportElement x=\"320\" y=\"138\" width=\"235\" height=\"14\"/>\n" +
                "                <textFieldExpression><![CDATA[\"Time: \" + $P{stayDates}]]></textFieldExpression>\n" +
                "            </textField>\n" +
                "            <line>\n" +
                "                <reportElement x=\"0\" y=\"158\" width=\"555\" height=\"1\" forecolor=\"#CBD5E1\"/>\n" +
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
                "                <textFieldExpression><![CDATA[\"Rs. \" + $F{unitPrice}]]></textFieldExpression>\n" +
                "            </textField>\n" +
                "            <textField>\n" +
                "                <reportElement x=\"450\" y=\"5\" width=\"105\" height=\"15\"/>\n" +
                "                <textElement textAlignment=\"Right\"/>\n" +
                "                <textFieldExpression><![CDATA[\"Rs. \" + $F{totalPrice}]]></textFieldExpression>\n" +
                "            </textField>\n" +
                "        </band>\n" +
                "    </detail>\n" +
                "    <summary>\n" +
                "        <band height=\"150\">\n" +
                "            <line>\n" +
                "                <reportElement x=\"0\" y=\"5\" width=\"555\" height=\"1\"/>\n" +
                "            </line>\n" +
                "            <staticText>\n" +
                "                <reportElement x=\"300\" y=\"15\" width=\"120\" height=\"20\"/>\n" +
                "                <textElement textAlignment=\"Right\"><font isBold=\"true\"/></textElement>\n" +
                "                <text><![CDATA[Subtotal:]]></text>\n" +
                "            </staticText>\n" +
                "            <textField>\n" +
                "                <reportElement x=\"430\" y=\"15\" width=\"125\" height=\"20\"/>\n" +
                "                <textElement textAlignment=\"Right\"><font isBold=\"true\"/></textElement>\n" +
                "                <textFieldExpression><![CDATA[\"Rs. \" + ($P{roomCharges} != null ? $P{roomCharges} : java.math.BigDecimal.ZERO)]]></textFieldExpression>\n" +
                "            </textField>\n" +
                "            <staticText>\n" +
                "                <reportElement x=\"300\" y=\"35\" width=\"120\" height=\"20\"/>\n" +
                "                <textElement textAlignment=\"Right\"/>\n" +
                "                <text><![CDATA[Tax / Service:]]></text>\n" +
                "            </staticText>\n" +
                "            <textField>\n" +
                "                <reportElement x=\"430\" y=\"35\" width=\"125\" height=\"20\"/>\n" +
                "                <textElement textAlignment=\"Right\"/>\n" +
                "                <textFieldExpression><![CDATA[\"Rs. \" + ($P{taxAmount} != null ? $P{taxAmount} : java.math.BigDecimal.ZERO)]]></textFieldExpression>\n" +
                "            </textField>\n" +
                "            <staticText>\n" +
                "                <reportElement x=\"300\" y=\"55\" width=\"120\" height=\"20\"/>\n" +
                "                <textElement textAlignment=\"Right\"/>\n" +
                "                <text><![CDATA[Discount:]]></text>\n" +
                "            </staticText>\n" +
                "            <textField>\n" +
                "                <reportElement x=\"430\" y=\"55\" width=\"125\" height=\"20\"/>\n" +
                "                <textElement textAlignment=\"Right\"/>\n" +
                "                <textFieldExpression><![CDATA[\"-Rs. \" + ($P{discountAmount} != null ? $P{discountAmount} : java.math.BigDecimal.ZERO)]]></textFieldExpression>\n" +
                "            </textField>\n" +
                "            <line>\n" +
                "                <reportElement x=\"300\" y=\"80\" width=\"255\" height=\"1\"/>\n" +
                "            </line>\n" +
                "            <staticText>\n" +
                "                <reportElement x=\"300\" y=\"85\" width=\"120\" height=\"20\"/>\n" +
                "                <textElement textAlignment=\"Right\"><font size=\"12\" isBold=\"true\"/></textElement>\n" +
                "                <text><![CDATA[Total Amount:]]></text>\n" +
                "            </staticText>\n" +
                "            <textField>\n" +
                "                <reportElement x=\"430\" y=\"85\" width=\"125\" height=\"20\"/>\n" +
                "                <textElement textAlignment=\"Right\"><font size=\"12\" isBold=\"true\"/></textElement>\n" +
                "                <textFieldExpression><![CDATA[\"Rs. \" + ($P{totalAmount} != null ? $P{totalAmount} : java.math.BigDecimal.ZERO)]]></textFieldExpression>\n" +
                "            </textField>\n" +
                "            <textField>\n" +
                "                <reportElement x=\"0\" y=\"120\" width=\"555\" height=\"20\"/>\n" +
                "                <textElement textAlignment=\"Center\"><font isItalic=\"true\"/></textElement>\n" +
                "                <textFieldExpression><![CDATA[$P{paymentStatus}.equals(\"PAID\") ? \"PAID IN FULL - THANK YOU!\" : \"PAYMENT PENDING\"]]></textFieldExpression>\n" +
                "            </textField>\n" +
                "        </band>\n" +
                "    </summary>\n" +
                "</jasperReport>";
    }
}
