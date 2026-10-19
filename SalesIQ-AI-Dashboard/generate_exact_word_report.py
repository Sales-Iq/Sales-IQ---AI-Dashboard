import os
import json
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

def create_exact_report():
    doc = Document()

    # 1. Page Margins (1 inch all sides)
    for section in doc.sections:
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.0)
        section.right_margin = Inches(1.0)

    # Styles
    style_normal = doc.styles['Normal']
    font_normal = style_normal.font
    font_normal.name = 'Times New Roman'
    font_normal.size = Pt(12)
    font_normal.color.rgb = RGBColor(0, 0, 0)

    images_dir = r"C:\Users\karan\Desktop\transfer 31_8_26\SalesIQ-AI-Dashboard-Admin-Staff-Realtime-Charts\SalesIQ-AI-Dashboard-Admin-Staff-Realtime-Charts\SalesIQ-AI-Dashboard\extracted_images"

    # Helpers
    def set_cell_background(cell, fill_hex):
        tcPr = cell._tc.get_or_add_tcPr()
        shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
        tcPr.append(shd)

    def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
        tcPr = cell._tc.get_or_add_tcPr()
        tcMar = parse_xml(
            f'<w:tcMar {nsdecls("w")}>'
            f'<w:top w:w="{top}" w:type="dxa"/>'
            f'<w:bottom w:w="{bottom}" w:type="dxa"/>'
            f'<w:left w:w="{left}" w:type="dxa"/>'
            f'<w:right w:w="{right}" w:type="dxa"/>'
            f'</w:tcMar>'
        )
        tcPr.append(tcMar)

    def set_table_borders(table, color="B0B0B0", sz="4", val="single"):
        tblPr = table._tbl.tblPr
        borders = parse_xml(
            f'<w:tblBorders {nsdecls("w")}>'
            f'<w:top w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
            f'<w:bottom w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
            f'<w:left w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
            f'<w:right w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
            f'<w:insideH w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
            f'<w:insideV w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
            f'</w:tblBorders>'
        )
        tblPr.append(borders)

    def format_row(row, bg_hex=None, bold=False, font_size=10, text_color=None, align=WD_ALIGN_PARAGRAPH.LEFT):
        for cell in row.cells:
            if bg_hex:
                set_cell_background(cell, bg_hex)
            set_cell_margins(cell, top=100, bottom=100, left=120, right=120)
            cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
            for p in cell.paragraphs:
                p.alignment = align
                p.paragraph_format.space_before = Pt(2)
                p.paragraph_format.space_after = Pt(2)
                p.paragraph_format.line_spacing = 1.15
                for run in p.runs:
                    run.font.name = "Times New Roman"
                    run.font.size = Pt(font_size)
                    run.bold = bold
                    if text_color:
                        run.font.color.rgb = text_color

    def add_p(text="", align=WD_ALIGN_PARAGRAPH.LEFT, space_before=0, space_after=6, line_spacing=1.15, bold=False, italic=False, font_size=12, color=None):
        p = doc.add_paragraph()
        p.alignment = align
        p.paragraph_format.space_before = Pt(space_before)
        p.paragraph_format.space_after = Pt(space_after)
        p.paragraph_format.line_spacing = line_spacing
        if text:
            run = p.add_run(text)
            run.bold = bold
            run.italic = italic
            run.font.name = "Times New Roman"
            run.font.size = Pt(font_size)
            if color:
                run.font.color.rgb = color
        return p

    def add_bullet(text, bold_prefix="", space_after=4):
        p = doc.add_paragraph(style='List Bullet')
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(space_after)
        p.paragraph_format.line_spacing = 1.15
        if bold_prefix:
            r_bold = p.add_run(bold_prefix)
            r_bold.bold = True
            r_bold.font.name = "Times New Roman"
            r_bold.font.size = Pt(12)
        r_text = p.add_run(text)
        r_text.font.name = "Times New Roman"
        r_text.font.size = Pt(12)
        return p

    def add_heading_1(text):
        return add_p(text, align=WD_ALIGN_PARAGRAPH.CENTER, space_before=16, space_after=12, bold=True, font_size=16)

    def add_heading_2(text):
        return add_p(text, align=WD_ALIGN_PARAGRAPH.LEFT, space_before=14, space_after=6, bold=True, font_size=14)

    def add_heading_3(text):
        return add_p(text, align=WD_ALIGN_PARAGRAPH.LEFT, space_before=10, space_after=4, bold=True, font_size=12)

    def add_image_box(filename, width_in_inches=5.5):
        img_path = os.path.join(images_dir, filename)
        if os.path.exists(img_path):
            p = doc.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p.paragraph_format.space_before = Pt(10)
            p.paragraph_format.space_after = Pt(10)
            p.add_run().add_picture(img_path, width=Inches(width_in_inches))

    # =========================================================================
    # SLIDE 1: COVER PAGE
    # =========================================================================
    add_p("", space_before=30)
    logo_path = os.path.join(images_dir, "slide_1_1.png")
    if os.path.exists(logo_path):
        lp = doc.add_paragraph()
        lp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        lp.paragraph_format.space_after = Pt(24)
        lp.add_run().add_picture(logo_path, width=Inches(4.2))

    add_p("A", align=WD_ALIGN_PARAGRAPH.CENTER, space_before=4, space_after=2, bold=True, font_size=13)
    add_p("Project presentation on", align=WD_ALIGN_PARAGRAPH.CENTER, space_before=0, space_after=12, bold=True, font_size=13)
    add_p("SalesIQ", align=WD_ALIGN_PARAGRAPH.CENTER, space_before=0, space_after=8, bold=True, font_size=24)
    add_p("M.C.A. Semester-III", align=WD_ALIGN_PARAGRAPH.CENTER, space_before=0, space_after=28, bold=True, font_size=14)

    add_p("KARAN PATEL", align=WD_ALIGN_PARAGRAPH.CENTER, space_before=0, space_after=2, bold=True, font_size=13)
    add_p("(25034211116)", align=WD_ALIGN_PARAGRAPH.CENTER, space_before=0, space_after=8, bold=True, font_size=12)
    add_p("HARSH DARJI", align=WD_ALIGN_PARAGRAPH.CENTER, space_before=0, space_after=2, bold=True, font_size=13)
    add_p("(25034211094)", align=WD_ALIGN_PARAGRAPH.CENTER, space_before=0, space_after=24, bold=True, font_size=12)

    add_p("Guided by", align=WD_ALIGN_PARAGRAPH.CENTER, space_before=0, space_after=2, bold=True, font_size=12)
    add_p("Prof. Narendra Patel", align=WD_ALIGN_PARAGRAPH.CENTER, space_before=0, space_after=24, bold=True, font_size=13)

    add_p("Submitted to", align=WD_ALIGN_PARAGRAPH.CENTER, space_before=0, space_after=2, bold=True, font_size=12)
    add_p("Acharya Motibhai Patel Institute of Computer Studies,", align=WD_ALIGN_PARAGRAPH.CENTER, space_before=0, space_after=2, bold=True, font_size=12)
    add_p("Ganpat University", align=WD_ALIGN_PARAGRAPH.CENTER, space_before=0, space_after=6, bold=True, font_size=12)
    add_p("July - Dec 2026", align=WD_ALIGN_PARAGRAPH.CENTER, space_before=0, space_after=0, bold=True, font_size=12)

    doc.add_page_break()

    # =========================================================================
    # SLIDE 2 & 3: 1. INTRODUCTION & 1.1 Project Profile
    # =========================================================================
    add_heading_1("1. INTRODUCTION")
    add_heading_2("1.1 Project Profile")

    table_data_3 = [
        ["Project Title", "SalesIQ"],
        ["Project Category", "Web Application"],
        ["Objective", "To develop an AI-powered Sales and Inventory Forecasting Dashboard that helps admins and sales staff track sales, manage stock, view real-time analytics, and get smart business suggestions."],
        ["Front End", "HTML5, Tailwind CSS, JavaScript"],
        ["Back End", "Firebase, Firestore"],
        ["Tool", "Visual Studio Code, Firebase Console, Gemini API"],
        ["Server", "Firebase Cloud Server"],
        ["Documentation Tool", "Microsoft Word, Microsoft PowerPoint"],
        ["Internal Guide", "Prof. Narendra Patel"],
        ["Developed By", "Karan Patel (25034211116)\nHarsh Darji (25034211094)"],
        ["Group No", "21"]
    ]

    t3 = doc.add_table(rows=len(table_data_3), cols=2)
    t3.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(t3)
    for idx, row in enumerate(table_data_3):
        t3.rows[idx].cells[0].paragraphs[0].text = row[0]
        t3.rows[idx].cells[1].paragraphs[0].text = row[1]
        format_row(t3.rows[idx], bg_hex="F8FAFC" if idx % 2 == 0 else "FFFFFF", font_size=10.5)
        t3.rows[idx].cells[0].paragraphs[0].runs[0].bold = True

    add_p("", space_after=12)
    doc.add_page_break()

    # =========================================================================
    # SLIDES 4-10: 2. SYSTEM STUDY AND ANALYSIS
    # =========================================================================
    add_heading_1("2. SYSTEM STUDY AND ANALYSIS")

    # Slide 5: 2.1 Problem Statement
    add_heading_2("2.1 Problem Statement")
    add_bullet("Small and medium retail/general stores commonly manage sales, billing and inventory using manual registers, disconnected spreadsheets or basic standalone billing software.")
    add_bullet("Admins and owners have no real-time visibility into revenue, stock levels or staff performance unless reports are compiled by hand.")
    add_bullet("Low-stock and out-of-stock situations are usually noticed only after a sale is missed, with no way to anticipate demand or plan reorders in advance.")
    add_bullet("There is no single connected platform where an Admin and multiple Sales Staff can work together with instantly synchronized sales and stock data.")
    add_bullet("SalesIQ aims to design and build a web-based dashboard that centralizes sales, inventory and staff activity, and augments it with AI-based forecasting and business suggestions.")

    # Slide 6: 2.2 Existing System
    add_heading_2("2.2 Existing System")
    add_bullet("In the traditional system, sales and stock records are usually maintained manually in notebooks, Excel sheets or separate standalone billing tools.")
    add_bullet("Each staff member records sales independently; there is no shared, real-time view of stock or revenue across the business.")
    add_bullet("Reports on low-stock products, daily revenue, product performance and staff-wise sales must be compiled by hand.")
    add_bullet("There is no automatic forecasting or AI-based suggestion system to support day-to-day decision making.")

    # Slide 7: 2.2.1 Drawbacks
    add_heading_3("2.2.1 Drawbacks")
    add_bullet("Manual records are error-prone, hard to search, and easily lost or duplicated.")
    add_bullet("No real-time synchronization between what staff sell and what the Admin sees on the dashboard.")
    add_bullet("Stock updates lag behind actual sales, causing overselling or missed reorders.")
    add_bullet("Report generation is slow and depends on manual compilation at the end of the day or week.")
    add_bullet("Staff accountability is difficult to track without a centralized, timestamped sales log.")

    # Slide 8: 2.2 Proposed System
    add_heading_2("2.2 Proposed System")
    add_bullet("SalesIQ provides a single web-based platform where Admin and Sales Staff work from one connected system.")
    add_bullet("Sales created by staff or admin are stored in Cloud Firestore and reflected instantly on the dashboard through real-time listeners.")
    add_bullet("Product stock is reduced automatically after billing, and low-stock or out-of-stock products are highlighted automatically.")
    add_bullet("Stock-finish and reorder forecasts are calculated automatically from sales history (FEFO-aware, per batch), and a Gemini-powered AI insights assistant answers natural-language questions about revenue trends, fast-moving products and expiry risk.")

    # Slide 9: 2.2.1 Advantages / Comparison Study
    add_heading_3("2.2.1 Advantages / Comparison Study")
    comp_data = [
        ["Aspect", "Existing System", "Proposed System (SalesIQ)"],
        ["Record keeping", "Manual notebooks / Excel sheets", "Centralized Firestore database"],
        ["Data visibility", "Delayed, compiled manually", "Real-time dashboard for Admin & Staff"],
        ["Stock updates", "Manual, often outdated", "Automatic on every sale"],
        ["Low-stock alerts", "Noticed only after stock-out", "Automatic, real-time alerts"],
        ["Reporting", "Manual, time-consuming", "Instant charts & reports"],
        ["Forecasting", "None", "Formula-based stock forecasting + Gemini-powered AI insights chat"],
        ["Staff accountability", "Hard to track", "Staff-wise sales history logged automatically"]
    ]
    t_comp = doc.add_table(rows=len(comp_data), cols=3)
    t_comp.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(t_comp)
    for idx, row in enumerate(comp_data):
        for c_idx, val in enumerate(row):
            t_comp.rows[idx].cells[c_idx].paragraphs[0].text = val
        if idx == 0:
            format_row(t_comp.rows[idx], bg_hex="E2E8F0", bold=True, font_size=10.5, align=WD_ALIGN_PARAGRAPH.CENTER)
        else:
            format_row(t_comp.rows[idx], bg_hex="FFFFFF" if idx % 2 != 0 else "F8FAFC", font_size=10)
            t_comp.rows[idx].cells[0].paragraphs[0].runs[0].bold = True

    add_p("", space_after=8)

    # Slide 10: 2.2.2 Modules (with short description)
    add_heading_2("2.2.2 Modules (with short description)")
    
    add_heading_3("Admin Module")
    add_bullet("Register/login; the app is multi-admin — each Admin's products, staff and sales are scoped independently.")
    add_bullet("Manage products, inventory, batches, suppliers, purchases, customers, notifications and settings.")
    add_bullet("Claim staff who self-register: assign to self, assign by username, bulk-assign, reassign to another Admin, or deactivate/remove.")
    add_bullet("View dashboard KPIs, live charts, batch expiry alerts, and ask the AI insights assistant business questions.")

    add_heading_3("Batch & Expiry Module")
    add_bullet("Track each purchased batch (supplier, MFG/expiry date, purchased vs. remaining quantity, cost) with an automatic status ladder from Active through Near/Critical Expiry to Expired.")
    add_bullet("Print batch labels and export batch reports to CSV.")

    add_heading_3("Disposals Module")
    add_bullet("Dispose stock from a batch (Expired, Damaged, Recalled, Lost, Returned, Other); reduces batch and product stock together and logs a disposal record.")

    add_heading_3("Sales Staff Module")
    add_bullet("Self-register with a username, then wait for an Admin to assign them before they can sell.")
    add_bullet("Create a new sale by selecting a product, entering quantity and payment mode; stock reduces automatically on completion.")
    add_bullet("View available stock, check own sales history and create customer billing entries.")

    doc.add_page_break()

    # =========================================================================
    # SLIDES 11-16: 3. DEVELOPMENT ENVIRONMENT
    # =========================================================================
    add_heading_1("3. DEVELOPMENT ENVIRONMENT")

    # Slide 12: 3.1 Hardware Requirement
    add_heading_2("3.1 Hardware Requirement")
    
    add_heading_3("Server Side")
    hw_server_data = [
        ["RAM", "8 GB (Minimum), 16 GB (Recommended)"],
        ["Processor", "Intel i3 or higher"],
        ["Internal Storage", "1 TB (Minimum)"]
    ]
    t_hw_s = doc.add_table(rows=len(hw_server_data), cols=2)
    t_hw_s.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(t_hw_s)
    for idx, row in enumerate(hw_server_data):
        t_hw_s.rows[idx].cells[0].paragraphs[0].text = row[0]
        t_hw_s.rows[idx].cells[1].paragraphs[0].text = row[1]
        format_row(t_hw_s.rows[idx], bg_hex="FFFFFF", font_size=10)
        t_hw_s.rows[idx].cells[0].paragraphs[0].runs[0].bold = True

    add_p("", space_after=6)
    add_heading_3("Client Side")
    hw_client_data = [
        ["RAM", "4 GB (Minimum)"],
        ["Processor", "Dual core or higher"],
        ["Internal Storage", "100 MB (Minimum)"]
    ]
    t_hw_c = doc.add_table(rows=len(hw_client_data), cols=2)
    t_hw_c.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(t_hw_c)
    for idx, row in enumerate(hw_client_data):
        t_hw_c.rows[idx].cells[0].paragraphs[0].text = row[0]
        t_hw_c.rows[idx].cells[1].paragraphs[0].text = row[1]
        format_row(t_hw_c.rows[idx], bg_hex="FFFFFF", font_size=10)
        t_hw_c.rows[idx].cells[0].paragraphs[0].runs[0].bold = True

    add_p("", space_after=8)

    # Slide 13: 3.2 Software Requirement
    add_heading_2("3.2 Software Requirement")

    add_heading_3("Server Side")
    sw_server_data = [
        ["Operating System", "Windows 10/11"],
        ["Web server", "Visual Studio Code, Firebase Console"],
        ["Front end", "Html, tailwind css, javascript vanilla"],
        ["database", "firestore"]
    ]
    t_sw_s = doc.add_table(rows=len(sw_server_data), cols=2)
    t_sw_s.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(t_sw_s)
    for idx, row in enumerate(sw_server_data):
        t_sw_s.rows[idx].cells[0].paragraphs[0].text = row[0]
        t_sw_s.rows[idx].cells[1].paragraphs[0].text = row[1]
        format_row(t_sw_s.rows[idx], bg_hex="FFFFFF", font_size=10)
        t_sw_s.rows[idx].cells[0].paragraphs[0].runs[0].bold = True

    add_p("", space_after=6)
    add_heading_3("Client Side")
    sw_client_data = [
        ["Browser", "Chrome, Brave, Safari, Edge"],
        ["Operating System", "Windows 10/11 or any compatible"]
    ]
    t_sw_c = doc.add_table(rows=len(sw_client_data), cols=2)
    t_sw_c.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(t_sw_c)
    for idx, row in enumerate(sw_client_data):
        t_sw_c.rows[idx].cells[0].paragraphs[0].text = row[0]
        t_sw_c.rows[idx].cells[1].paragraphs[0].text = row[1]
        format_row(t_sw_c.rows[idx], bg_hex="FFFFFF", font_size=10)
        t_sw_c.rows[idx].cells[0].paragraphs[0].runs[0].bold = True

    add_p("", space_after=8)

    # Slide 14: 3.3 Programming Environment
    add_heading_2("3.3 Programming Environment")
    add_heading_3("Server Side")
    add_p("Firebase Cloud Server hosts the application and the Firestore database.")
    add_heading_3("Client Side")
    add_p("Any modern browser (Chrome, Brave, Safari, Edge) running on desktop or mobile.")
    add_p("Development is done in Visual Studio Code with the Firebase CLI and Firebase Console for configuration, rules and monitoring.")

    # Slide 15: 3.3.1 About Front-End
    add_heading_3("3.3.1 About Front-End")
    add_bullet("HTML5 is used for the page structure and semantic markup of the dashboard.")
    add_bullet("Tailwind CSS provides a responsive, utility-first design system used consistently across all dashboard views.")
    add_bullet("JavaScript (vanilla) drives interactivity, real-time chart updates and Firestore listener handling.")
    add_bullet("A charting library (e.g. Chart.js) renders animated, real-time revenue and sales visualizations on the dashboard.")

    # Slide 16: 3.3.2 About Back-End
    add_heading_3("3.3.2 About Back-End")
    add_bullet("Firebase Authentication handles Admin and Sales Staff login and role-based access.")
    add_bullet("Cloud Firestore acts as the real-time NoSQL database for Admin, Staff, Product, Batch and Sales records.")
    add_bullet("Firebase Hosting deploys and serves the web application from Firebase's cloud server.")
    add_bullet("The Gemini API (Llama 3.1/3.3 and Gemma2 models) powers an AI insights chat that answers business questions from the stored sales, batch and disposal data. Stock-finish and reorder forecasts are computed separately with a deterministic average-daily-sales / FEFO formula.")

    doc.add_page_break()

    # =========================================================================
    # SLIDES 17-26: 4. SYSTEM DESIGN AND DEVELOPMENT - 4.1 UML DIAGRAMS
    # =========================================================================
    add_heading_1("4. SYSTEM DESIGN AND DEVELOPMENT")
    add_heading_2("4.1 USER MODELING LANGUAGE DIAGRAMS")

    # Slide 19: 4.1.1 Flowchart
    add_heading_3("4.1.1 Flowchart")
    add_image_box("slide_19_20.png", width_in_inches=3.0)

    # Slide 20: 4.1.2 Use-Case Diagram
    add_heading_3("4.1.2 Use-Case Diagram")
    add_image_box("slide_20_22.png", width_in_inches=4.8)

    # Slide 21: 4.1.3 Activity Diagram – Admin
    add_heading_3("4.1.3 Activity Diagram – Admin")
    add_image_box("slide_21_24.png", width_in_inches=4.4)

    # Slide 22: 4.1.3 Activity Diagram – Sales Staff
    add_heading_3("4.1.3 Activity Diagram – Sales Staff")
    add_image_box("slide_22_25.png", width_in_inches=3.2)

    # Slide 23: 4.1.4 Sequence Diagram – Admin
    add_heading_3("4.1.4 Sequence Diagram – Admin")
    add_image_box("slide_23_28.png", width_in_inches=4.6)

    # Slide 24: 4.1.4 Sequence Diagram – Sales Staff
    add_heading_3("4.1.4 Sequence Diagram – Sales Staff")
    add_image_box("slide_24_30.png", width_in_inches=4.8)

    # Slide 25: 4.1.5 Deployment Diagram
    add_heading_3("4.1.5 Deployment Diagram")
    add_p("Note: dashed association lines represent deployment/communication paths between nodes.", italic=True, font_size=10.5)
    add_image_box("slide_25_32.png", width_in_inches=4.5)

    # Slide 26: 4.1.6 Class Diagram
    add_heading_3("4.1.6 Class Diagram")
    add_image_box("slide_26_34.png", width_in_inches=4.8)

    doc.add_page_break()

    # =========================================================================
    # SLIDES 27-33: 4.2 DATA DICTIONARY
    # =========================================================================
    add_heading_2("4.2 DATA DICTIONARY")

    def add_data_dict_table(title, pk, fk, desc, data):
        add_heading_3(title)
        add_p(f"Primary Key :- {pk}", bold=True, font_size=11, space_after=2)
        if fk:
            add_p(f"Foreign Key :- {fk}", bold=True, font_size=11, space_after=2)
        add_p(f"Table Description :- {desc}", font_size=11, space_after=6)

        tbl = doc.add_table(rows=len(data), cols=5)
        tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        set_table_borders(tbl)
        for idx, row in enumerate(data):
            for c_idx, val in enumerate(row):
                tbl.rows[idx].cells[c_idx].paragraphs[0].text = val
            if idx == 0:
                format_row(tbl.rows[idx], bg_hex="E2E8F0", bold=True, font_size=10, align=WD_ALIGN_PARAGRAPH.CENTER)
            else:
                format_row(tbl.rows[idx], bg_hex="FFFFFF", font_size=9.5)
                tbl.rows[idx].cells[0].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
                tbl.rows[idx].cells[1].paragraphs[0].runs[0].bold = True
        add_p("", space_after=10)

    # Slide 28: 1. Admins
    add_data_dict_table(
        "1. Admins",
        "admin_id",
        None,
        "Represents Admin details.",
        [
            ["Sr.No", "Field Name", "Data Type", "Constraint", "Description"],
            ["1", "admin_id", "String", "Primary Key", "Unique identifier."],
            ["2", "Admin_name", "String", "Not Null", "Stores admin name."],
            ["3", "E-mail", "String", "Not Null", "Stores admin e-mail."],
            ["4", "Status", "Boolean", "Not Null", "Status of the admin: Active or Not-Active."]
        ]
    )

    # Slide 29: 2. Staff
    add_data_dict_table(
        "2. Staff",
        "staff_id",
        "assignedAdminId",
        "Represents Sales Staff details. Staff self-register and stay pending until an Admin assigns them.",
        [
            ["Sr.No", "Field Name", "Data Type", "Constraint", "Description"],
            ["1", "staff_id", "ObjectId", "Primary Key", "Unique identifier."],
            ["2", "username", "String", "Not Null, Unique", "Login username, used by Admin to assign staff."],
            ["3", "staff_name", "String", "Not Null", "Stores staff name."],
            ["4", "E-mail", "String", "Not Null", "Stores staff e-mail."],
            ["5", "assignedAdminId", "Object", "Foreign Key (nullable)", "Admin this staff is assigned to; empty while pending."],
            ["6", "adminName", "String", "Nullable", "Denormalized name of the assigned admin."],
            ["7", "status", "String", "Not Null", "pending_assignment, active, or inactive."],
            ["8", "assignedAt", "Timestamp", "Nullable", "When the staff was assigned to an admin."]
        ]
    )

    # Slide 30: 3. Products
    add_data_dict_table(
        "3. Products",
        "product_id",
        "adminId",
        "Represents product details, scoped per Admin.",
        [
            ["Sr.No", "Field Name", "Data Type", "Constraint", "Description"],
            ["1", "product_id", "ObjectId", "Primary Key", "Unique identifier."],
            ["2", "adminId", "Object", "Foreign Key", "Owning admin — products are scoped per admin."],
            ["3", "category", "String", "Not Null", "Stores the category of the product."],
            ["4", "product_name", "String", "Not Null", "Stores product name."],
            ["5", "price", "Double", "Not Null", "Selling price."],
            ["6", "stock", "Int", "Not Null", "Total stock across all batches."],
            ["7", "minStock", "Int", "Not Null", "Threshold used to flag “Low Stock”."]
        ]
    )

    # Slide 31: 4. Product Batches
    add_data_dict_table(
        "4. Product Batches",
        "batch_id",
        "adminId, productId",
        "Represents a purchased batch of a product, with expiry / FEFO tracking.",
        [
            ["Sr.No", "Field Name", "Data Type", "Constraint", "Description"],
            ["1", "batch_id", "ObjectId", "Primary Key", "Unique identifier."],
            ["2", "batchNumber", "String", "Not Null", "Human-readable batch number, printed on labels."],
            ["3", "productId", "Object", "Foreign Key", "Stores id of product."],
            ["4", "supplierName", "String", "Nullable", "Supplier this batch was purchased from."],
            ["5", "manufactureDate / expiryDate", "Date", "Not Null", "Used to compute batch status (Active → Upcoming → Near → Critical → Expired)."],
            ["6", "purchasedQuantity", "Int", "Not Null", "Quantity originally received."],
            ["7", "remainingQuantity", "Int", "Not Null", "Quantity left to sell; reduced by sales/disposals."],
            ["8", "purchasePrice", "Double", "Not Null", "Cost price, used for batch stock value."],
            ["9", "status", "String", "Not Null", "Active, Disposed, or Empty (expiry-based statuses are computed, not stored)."]
        ]
    )

    # Slide 32: 5. Sales
    add_data_dict_table(
        "5. Sales",
        "sales_id",
        "adminId, staffId, productId",
        "Represents a sale / billing record.",
        [
            ["Sr.No", "Field Name", "Data Type", "Constraint", "Description"],
            ["1", "sales_id", "ObjectId", "Primary Key", "Unique identifier."],
            ["2", "adminId", "Object", "Foreign Key", "Owning admin — sales are scoped per admin."],
            ["3", "staffId", "Object", "Foreign Key (nullable)", "Staff who made the sale; null for admin billing."],
            ["4", "productId", "ObjectId", "Foreign Key", "Reference to product sold."],
            ["5", "invoiceNumber", "String", "Not Null", "Printed on the customer bill."],
            ["6", "quantity", "Int", "Not Null", "Units sold."],
            ["7", "totalAmount", "Double", "Not Null", "Sale value."],
            ["8", "source", "String", "Not Null", "staff, admin, or dummy (demo data generator)."]
        ]
    )

    # Slide 33: 6. Disposals
    add_data_dict_table(
        "6. Disposals",
        "disposal_id",
        "productId, batchId",
        "Represents stock written off from a batch — expired, damaged, recalled, lost or returned.",
        [
            ["Sr.No", "Field Name", "Data Type", "Constraint", "Description"],
            ["1", "disposal_id", "ObjectId", "Primary Key", "Unique identifier."],
            ["2", "productId", "Object", "Foreign Key", "Reference to product."],
            ["3", "batchId / batchNumber", "Object / String", "Foreign Key", "Reference to the batch disposed from."],
            ["4", "quantity", "Int", "Not Null", "Units disposed."],
            ["5", "reason", "String", "Not Null", "Expired, Damaged, Recalled, Lost, Returned or Other."],
            ["6", "remarks", "String", "Nullable", "Free-text note."],
            ["7", "disposedAt / disposedBy", "Timestamp / Object", "Not Null", "When and by which admin the disposal was recorded."]
        ]
    )

    doc.add_page_break()

    # =========================================================================
    # SLIDES 34-36: 4.3 Input Design
    # =========================================================================
    add_heading_2("4.3 Input Design")
    
    # Slide 34: Signup page:- New user creation page
    add_p("Signup page:- New user creation page", bold=True, font_size=11)
    add_image_box("slide_34_43.png", width_in_inches=5.2)

    # Slide 35: Add product form:- To add new products
    add_p("Add product form:- To add new products", bold=True, font_size=11)
    add_image_box("slide_35_44.png", width_in_inches=4.8)

    # Slide 36: Add sales:- To add sell of a product
    add_p("Add sales:- To add sell of a product", bold=True, font_size=11)
    add_image_box("slide_36_45.png", width_in_inches=5.0)

    doc.add_page_break()

    # =========================================================================
    # SLIDES 37-40: 4.4 Output Design
    # =========================================================================
    add_heading_2("4.4 Output Design")

    # Slide 37: Dashboard:- shows sales analytics
    add_p("Dashboard:- shows sales analytics", bold=True, font_size=11)
    add_image_box("slide_37_47.png", width_in_inches=5.5)

    # Slide 38: Products & Inventory:- shows inventory and products information
    add_p("Products & Inventory:- shows inventory and products information", bold=True, font_size=11)
    add_image_box("slide_38_48.png", width_in_inches=5.5)

    # Slide 39: Forecasting page:- shows sales forecast of selected products
    add_p("Forecasting page:- shows sales forecast of selected products", bold=True, font_size=11)
    add_image_box("slide_39_49.png", width_in_inches=5.5)

    # Slide 40: Forecasting page:- AI business insights and strategic analytics dashboard
    add_p("Forecasting page:- AI business insights and strategic analytics dashboard", bold=True, font_size=11)
    add_image_box("slide_40_50.png", width_in_inches=5.5)

    doc.add_page_break()

    # =========================================================================
    # SLIDES 41-44: 5. SYSTEM TESTING
    # =========================================================================
    add_heading_1("5. SYSTEM TESTING")

    # Slide 42: 5.1 System Testing
    add_heading_2("5.1 System Testing")
    add_bullet("Each module (Admin, Sales Staff) was tested individually and then as an integrated system before deployment.")
    add_bullet("Testing focused on two categories: Output Testing — correctness of dashboard values, reports and charts; and Validation Testing — input field checks and error handling.")
    add_bullet("Testing was carried out on Chrome, Edge and Safari, across both desktop and mobile viewport sizes.")
    add_bullet("Real-time behaviour was verified by performing a sale on one device/staff account and confirming the Admin dashboard updated instantly on another.")

    add_p("", space_after=6)

    # Slide 43: 5.1.1 Output Testing
    add_heading_3("5.1.1 Output Testing")
    out_test_data = [
        ["Test Case", "Input / Action", "Expected Output", "Actual Output", "Result"],
        ["TC-01", "Staff completes a sale of 3 units", "Stock reduces by 3; sale appears instantly on Admin dashboard", "Stock reduces by 3; sale appears instantly on Admin dashboard", "Pass"],
        ["TC-02", "Product stock falls below reorder threshold", "Product flagged as “Low Stock” on dashboard", "Product flagged as “Low Stock” on dashboard", "Pass"],
        ["TC-03", "Admin opens dashboard after multiple sales", "Total revenue & order count match sum of Firestore sales records", "Total revenue & order count match sum of Firestore sales records", "Pass"],
        ["TC-04", "Admin asks the AI insights assistant a business question", "Total revenue & order count match sum of Firestore sales records", "Total revenue & order count match sum of Firestore sales records", "Pass"]
    ]
    t_out = doc.add_table(rows=len(out_test_data), cols=5)
    t_out.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(t_out)
    for idx, row in enumerate(out_test_data):
        for c_idx, val in enumerate(row):
            t_out.rows[idx].cells[c_idx].paragraphs[0].text = val
        if idx == 0:
            format_row(t_out.rows[idx], bg_hex="E2E8F0", bold=True, font_size=10, align=WD_ALIGN_PARAGRAPH.CENTER)
        else:
            format_row(t_out.rows[idx], bg_hex="FFFFFF", font_size=9.5)
            t_out.rows[idx].cells[0].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
            t_out.rows[idx].cells[4].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
            t_out.rows[idx].cells[4].paragraphs[0].runs[0].bold = True

    add_p("", space_after=8)

    # Slide 44: 5.1.2 Validation Testing
    add_heading_3("5.1.2 Validation Testing")
    val_test_data = [
        ["Test Case", "Input", "Expected Output", "Actual Output", "Result"],
        ["TC-05", "Sale quantity left blank or 0", "Form blocks submission; shows “Enter a valid quantity”", "Form blocks submission; shows “Enter a valid quantity”", "Pass"],
        ["TC-06", "Sale quantity greater than available stock", "Form blocks submission; shows “Insufficient stock”", "Form blocks submission; shows “Insufficient stock”", "Pass"],
        ["TC-07", "Staff e-mail left blank on registration", "Form blocks submission; shows “E-mail is required”", "Form blocks submission; shows “E-mail is required”", "Pass"],
        ["TC-08", "Invalid e-mail format entered", "Form blocks submission; shows “Enter a valid e-mail”", "Form blocks submission; shows “Enter a valid e-mail”", "Pass"],
        ["TC-09", "Unauthenticated user opens a dashboard URL directly", "User is redirected to the login page", "User is redirected to the login page", "Pass"]
    ]
    t_val = doc.add_table(rows=len(val_test_data), cols=5)
    t_val.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(t_val)
    for idx, row in enumerate(val_test_data):
        for c_idx, val in enumerate(row):
            t_val.rows[idx].cells[c_idx].paragraphs[0].text = val
        if idx == 0:
            format_row(t_val.rows[idx], bg_hex="E2E8F0", bold=True, font_size=10, align=WD_ALIGN_PARAGRAPH.CENTER)
        else:
            format_row(t_val.rows[idx], bg_hex="FFFFFF", font_size=9.5)
            t_val.rows[idx].cells[0].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
            t_val.rows[idx].cells[4].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
            t_val.rows[idx].cells[4].paragraphs[0].runs[0].bold = True

    doc.add_page_break()

    # =========================================================================
    # SLIDES 45-47: 6. CONCLUSION AND FUTURE ENHANCEMENT
    # =========================================================================
    add_heading_1("6. CONCLUSION AND FUTURE ENHANCEMENT")

    # Slide 46: 6.1 Conclusion
    add_heading_2("6.1 Conclusion")
    add_bullet("SalesIQ successfully brings Admin and Sales Staff onto one connected, real-time platform for sales and inventory management.")
    add_bullet("Firestore's real-time listeners ensure that every sale and stock update is reflected instantly across dashboards.")
    add_bullet("The AI insights layer, powered by Gemini, moves the system from a purely record-keeping tool to one that gives forward-looking, decision-support insights.")
    add_bullet("The project meets its core objective of replacing manual, disconnected record-keeping with a centralized, intelligent dashboard.")

    add_p("", space_after=6)

    # Slide 47: 6.2 Future Enhancements
    add_heading_2("6.2 Future Enhancements")
    add_bullet("Automated purchase-order generation when AI forecasting flags a reorder need.")
    add_bullet("A customer-facing module for order history and loyalty tracking.")
    add_bullet("Multi-branch / multi-store support with consolidated analytics.")
    add_bullet("Push/e-mail notifications for critical alerts (out-of-stock, unusual sales patterns).")
    add_bullet("Additional role-based access levels beyond Admin/Staff (e.g. Manager, Auditor).")
    add_bullet("A companion mobile app using the same Firebase backend.")

    doc.add_page_break()

    # =========================================================================
    # SLIDES 48-50: 7. BIBLIOGRAPHY & REFERENCES
    # =========================================================================
    add_heading_1("7. BIBLIOGRAPHY & REFERENCES")

    # Slide 49: 7.1 Books References
    add_heading_2("7.1 Books References")
    add_bullet("Sommerville, I., “Software Engineering”, Pearson Education.")
    add_bullet("Pressman, R.S., “Software Engineering: A Practitioner’s Approach”, McGraw-Hill.")
    add_bullet("Booch, G., Rumbaugh, J., Jacobson, I., “The Unified Modeling Language User Guide”, Addison-Wesley.")
    add_bullet("Elmasri, R., Navathe, S.B., “Fundamentals of Database Systems”, Pearson Education.")

    add_p("", space_after=6)

    # Slide 50: 7.2 Web References
    add_heading_2("7.2 Web References")
    add_bullet("Firebase Documentation — firebase.google.com/docs")
    add_bullet("Cloud Firestore Documentation — firebase.google.com/docs/firestore")
    add_bullet("Tailwind CSS Documentation — tailwindcss.com/docs")
    add_bullet("Gemini API Documentation — console.Gemini.com/docs")
    add_bullet("MDN Web Docs (HTML / JavaScript) — developer.mozilla.org")

    output_path = r"C:\Users\karan\Desktop\transfer 31_8_26\SalesIQ-AI-Dashboard-Admin-Staff-Realtime-Charts\SalesIQ-AI-Dashboard-Admin-Staff-Realtime-Charts\SalesIQ-AI-Dashboard\SalesIQ_Final_Report.docx"
    doc.save(output_path)
    print(f"Exact report generated successfully at: {output_path}")

    # Also copy to Downloads for user convenience
    downloads_path = r"C:\Users\karan\Downloads\SalesIQ_Final_Report.docx"
    import shutil
    shutil.copy(output_path, downloads_path)
    print(f"Copied to: {downloads_path}")

if __name__ == "__main__":
    create_exact_report()

