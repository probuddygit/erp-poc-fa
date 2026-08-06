// Sample master data for every registered master.
// Seeded once per browser (idempotent) so the platform, dashboards and the AI
// copilot all have realistic Faith Automation reference data to work with.
import { MASTERS, findMaster } from "./registry";
import { mdmStore } from "./store";

const SEED_FLAG = "faith-erp:mdm:seeded:v1";

type Rows = Record<string, Record<string, unknown>[]>;

export const MASTER_SEEDS: Rows = {
  customers: [
    { code: "CUS-0001", name: "Maruti Suzuki India Ltd", short_name: "MSIL", segment: "OEM", country: "IN", gstin: "06AAACM4950E1Z3", credit_limit: 45000000, payment_terms: "Net 60", email: "sourcing@maruti.co.in", phone: "+91 124 234 1000", active: true, notes: "BIW line partner — Manesar & Kharkhoda plants." },
    { code: "CUS-0002", name: "Tata Motors Ltd", short_name: "TML", segment: "OEM", country: "IN", gstin: "27AAACT2727Q1ZW", credit_limit: 38000000, payment_terms: "Net 45", email: "vendor.dev@tatamotors.com", phone: "+91 20 6613 3000", active: true },
    { code: "CUS-0003", name: "Mahindra & Mahindra Ltd", short_name: "M&M", segment: "OEM", country: "IN", gstin: "27AAACM3025E1ZL", credit_limit: 30000000, payment_terms: "Net 45", email: "purchase@mahindra.com", phone: "+91 22 2490 1441", active: true },
    { code: "CUS-0004", name: "Faurecia India Pvt Ltd", short_name: "Faurecia", segment: "TIER1", country: "IN", gstin: "33AABCF8123M1Z9", credit_limit: 12000000, payment_terms: "Net 30", email: "buyer.in@faurecia.com", phone: "+91 44 6745 2200", active: true },
    { code: "CUS-0005", name: "Gestamp Automotive Chennai", short_name: "Gestamp", segment: "TIER1", country: "IN", gstin: "33AAECG5566K1ZB", credit_limit: 9500000, payment_terms: "Net 30", email: "procurement@gestamp.in", phone: "+91 44 6620 1100", active: true },
    { code: "CUS-0006", name: "Volkswagen Group Werk Kassel", short_name: "VW Kassel", segment: "OEM", country: "DE", credit_limit: 22000000, payment_terms: "Net 60", email: "einkauf@volkswagen.de", phone: "+49 561 490 0", active: true },
    { code: "CUS-0007", name: "Nissan Motor Kyushu", short_name: "Nissan KY", segment: "OEM", country: "JP", credit_limit: 18000000, payment_terms: "Net 60", email: "supply@nissan.co.jp", phone: "+81 93 588 1111", active: true },
    { code: "CUS-0008", name: "Bosch Rexroth India", short_name: "Rexroth", segment: "TIER2", country: "IN", gstin: "27AAACB1112C1ZA", credit_limit: 6500000, payment_terms: "Net 30", email: "orders@boschrexroth.co.in", phone: "+91 20 6721 8000", active: true },
  ],
  suppliers: [
    { code: "SUP-0001", name: "FANUC India Pvt Ltd", category: "CAP", country: "IN", gstin: "29AAACF1234R1ZQ", rating: "A", lead_time_days: 45, email: "sales@fanucindia.com", phone: "+91 80 2852 0000", active: true },
    { code: "SUP-0002", name: "SMC Pneumatics India", category: "RAW", country: "IN", gstin: "06AACCS5432L1Z8", rating: "A", lead_time_days: 21, email: "orders@smcindia.com", phone: "+91 124 234 4400", active: true },
    { code: "SUP-0003", name: "Jindal Stainless Ltd", category: "RAW", country: "IN", gstin: "06AAACJ4448R1ZP", rating: "B", lead_time_days: 30, email: "sales@jindalstainless.com", phone: "+91 124 461 5000", active: true },
    { code: "SUP-0004", name: "Festo India Pvt Ltd", category: "RAW", country: "IN", gstin: "29AAACF9988H1ZM", rating: "A", lead_time_days: 28, email: "sales.in@festo.com", phone: "+91 80 2289 4100", active: true },
    { code: "SUP-0005", name: "Kuka Robotics India", category: "CAP", country: "DE", rating: "A", lead_time_days: 60, email: "sales@kuka.in", phone: "+91 20 6710 5000", active: true },
    { code: "SUP-0006", name: "Precision Weld Tooling Co", category: "SVC", country: "IN", gstin: "27AAFCP7654N1ZK", rating: "B", lead_time_days: 18, email: "info@precisionweld.in", phone: "+91 20 2712 3344", active: true },
    { code: "SUP-0007", name: "Sandvik Coromant India", category: "CONS", country: "IN", gstin: "27AAACS2233F1ZD", rating: "A", lead_time_days: 14, email: "orders.in@sandvik.com", phone: "+91 20 6612 1000", active: true },
    { code: "SUP-0008", name: "Hindalco Industries Ltd", category: "RAW", country: "IN", gstin: "27AAACH1201R1ZT", rating: "B", lead_time_days: 25, email: "sales@hindalco.com", phone: "+91 22 6691 7000", active: true },
  ],
  items: [
    { code: "ITM-0001", description: "CR Steel Sheet 1.2mm x 1250mm", category: "RAW", uom: "KG", hsn_code: "72091790", std_cost: 68, reorder_level: 5000, shelf_life_days: 0, active: true },
    { code: "ITM-0002", description: "Robotic Weld Gun C-Type 90kVA", category: "COMP", uom: "EA", hsn_code: "85152900", std_cost: 425000, reorder_level: 2, active: true },
    { code: "ITM-0003", description: "Pneumatic Clamp Unit 63mm", category: "COMP", uom: "EA", hsn_code: "84123190", std_cost: 8600, reorder_level: 40, active: true },
    { code: "ITM-0004", description: "BIW Underbody Sub-Assembly LH", category: "SUB", uom: "EA", hsn_code: "87082900", std_cost: 14500, reorder_level: 10, active: true },
    { code: "ITM-0005", description: "Body Side Outer Panel RH", category: "FG", uom: "EA", hsn_code: "87082900", std_cost: 21800, reorder_level: 6, active: true },
    { code: "ITM-0006", description: "Weld Tip Cap CuCrZr 16mm", category: "RAW", uom: "EA", hsn_code: "85159000", std_cost: 145, reorder_level: 500, shelf_life_days: 0, active: true },
    { code: "ITM-0007", description: "Servo Motor 1.5kW with Brake", category: "COMP", uom: "EA", hsn_code: "85015210", std_cost: 62000, reorder_level: 8, active: true },
    { code: "ITM-0008", description: "Aluminium Extrusion 40x40 Slot-8", category: "RAW", uom: "M", hsn_code: "76042990", std_cost: 480, reorder_level: 300, active: true },
    { code: "ITM-0009", description: "Hydraulic Oil ISO VG 46", category: "RAW", uom: "L", hsn_code: "27101980", std_cost: 210, reorder_level: 400, shelf_life_days: 730, active: true },
    { code: "ITM-0010", description: "Fixture Base Plate MS 800x600", category: "SUB", uom: "EA", hsn_code: "73269099", std_cost: 32000, reorder_level: 4, active: true },
  ],
  employees: [
    { code: "EMP-0001", full_name: "Rajesh Kulkarni", department: "ENG", designation: "Head - Engineering", date_of_joining: "2016-04-11", email: "rajesh.k@faithautomation.in", phone: "+91 98220 41122", active: true },
    { code: "EMP-0002", full_name: "Sneha Deshpande", department: "PROD", designation: "Production Manager", date_of_joining: "2018-07-02", email: "sneha.d@faithautomation.in", phone: "+91 98901 22334", active: true },
    { code: "EMP-0003", full_name: "Imran Shaikh", department: "QC", designation: "Quality Lead", date_of_joining: "2019-01-21", email: "imran.s@faithautomation.in", phone: "+91 99700 55112", active: true },
    { code: "EMP-0004", full_name: "Priya Nair", department: "SALES", designation: "Key Account Manager", date_of_joining: "2020-09-14", email: "priya.n@faithautomation.in", phone: "+91 98450 77219", active: true },
    { code: "EMP-0005", full_name: "Vikram Chauhan", department: "FIN", designation: "Finance Controller", date_of_joining: "2017-06-05", email: "vikram.c@faithautomation.in", phone: "+91 97020 33445", active: true },
    { code: "EMP-0006", full_name: "Anita Rane", department: "HR", designation: "HR Business Partner", date_of_joining: "2021-02-15", email: "anita.r@faithautomation.in", phone: "+91 90110 88776", active: true },
    { code: "EMP-0007", full_name: "Sourav Ghosh", department: "ENG", designation: "Senior Design Engineer", date_of_joining: "2021-11-08", email: "sourav.g@faithautomation.in", phone: "+91 89100 44556", active: true },
    { code: "EMP-0008", full_name: "Mahesh Patil", department: "PROD", designation: "Shop Floor Supervisor", date_of_joining: "2015-03-30", email: "mahesh.p@faithautomation.in", phone: "+91 94220 11009", active: true },
  ],
  machines: [
    { code: "MCH-0001", name: "Robotic Spot Weld Cell 1", type: "WELD", location: "Bay A - Weld Shop", capacity_per_hour: 42, commissioned_on: "2019-05-20", active: true },
    { code: "MCH-0002", name: "Robotic Spot Weld Cell 2", type: "WELD", location: "Bay A - Weld Shop", capacity_per_hour: 40, commissioned_on: "2020-08-12", active: true },
    { code: "MCH-0003", name: "Hydraulic Press 250T", type: "PRESS", location: "Bay B - Press Shop", capacity_per_hour: 120, commissioned_on: "2017-02-18", active: true },
    { code: "MCH-0004", name: "VMC Haas VF-4SS", type: "CNC", location: "Bay C - Machine Shop", capacity_per_hour: 8, commissioned_on: "2021-10-04", active: true },
    { code: "MCH-0005", name: "CNC Laser Cutting 4kW", type: "CNC", location: "Bay C - Machine Shop", capacity_per_hour: 15, commissioned_on: "2022-03-11", active: true },
    { code: "MCH-0006", name: "Final Assembly Station 1", type: "ASM", location: "Bay D - Assembly", capacity_per_hour: 6, commissioned_on: "2018-12-01", active: true },
  ],
  uom: [
    { code: "UOM-0001", name: "Each", symbol: "EA", dimension: "QTY", base_unit: "EA", conversion_factor: 1, decimal_places: 0, active: true },
    { code: "UOM-0002", name: "Kilogram", symbol: "KG", dimension: "WEIGHT", base_unit: "KG", conversion_factor: 1, decimal_places: 3, active: true },
    { code: "UOM-0003", name: "Metre", symbol: "M", dimension: "LENGTH", base_unit: "M", conversion_factor: 1, decimal_places: 2, active: true },
    { code: "UOM-0004", name: "Litre", symbol: "L", dimension: "VOLUME", base_unit: "L", conversion_factor: 1, decimal_places: 2, active: true },
    { code: "UOM-0005", name: "Square Metre", symbol: "SQM", dimension: "AREA", base_unit: "SQM", conversion_factor: 1, decimal_places: 2, active: true },
    { code: "UOM-0006", name: "Hour", symbol: "HR", dimension: "TIME", base_unit: "HR", conversion_factor: 1, decimal_places: 2, active: true },
    { code: "UOM-0007", name: "Tonne", symbol: "TON", dimension: "WEIGHT", base_unit: "KG", conversion_factor: 1000, decimal_places: 3, active: true },
  ],
  "hsn-codes": [
    { code: "HSN-0001", hsn: "72091790", description: "Cold rolled flat steel products, width ≥ 600mm", supply_type: "GOODS", chapter: "72", gst_rate: 18, cess_rate: 0, uom: "KG", active: true },
    { code: "HSN-0002", hsn: "87082900", description: "Other parts and accessories of bodies for motor vehicles", supply_type: "GOODS", chapter: "87", gst_rate: 28, cess_rate: 0, uom: "EA", active: true },
    { code: "HSN-0003", hsn: "85152900", description: "Resistance welding machines and apparatus", supply_type: "GOODS", chapter: "85", gst_rate: 18, cess_rate: 0, uom: "EA", active: true },
    { code: "HSN-0004", hsn: "84123190", description: "Pneumatic power engines and motors, linear acting", supply_type: "GOODS", chapter: "84", gst_rate: 18, cess_rate: 0, uom: "EA", active: true },
    { code: "HSN-0005", hsn: "76042990", description: "Aluminium bars, rods and profiles", supply_type: "GOODS", chapter: "76", gst_rate: 18, cess_rate: 0, uom: "M", active: true },
    { code: "HSN-0006", hsn: "998873", description: "Other manufacturing services on physical inputs", supply_type: "SERVICE", chapter: "99", gst_rate: 18, cess_rate: 0, uom: "HR", active: true },
    { code: "HSN-0007", hsn: "27101980", description: "Lubricating oils and preparations", supply_type: "GOODS", chapter: "27", gst_rate: 18, cess_rate: 0, uom: "L", active: true },
  ],
  "gst-rates": [
    { code: "GST-0001", name: "GST 0% - Exempt", rate: 0, cgst: 0, sgst: 0, igst: 0, cess: 0, effective_from: "2017-07-01", active: true },
    { code: "GST-0002", name: "GST 5%", rate: 5, cgst: 2.5, sgst: 2.5, igst: 5, cess: 0, effective_from: "2017-07-01", active: true },
    { code: "GST-0003", name: "GST 12%", rate: 12, cgst: 6, sgst: 6, igst: 12, cess: 0, effective_from: "2017-07-01", active: true },
    { code: "GST-0004", name: "GST 18%", rate: 18, cgst: 9, sgst: 9, igst: 18, cess: 0, effective_from: "2017-07-01", active: true },
    { code: "GST-0005", name: "GST 28%", rate: 28, cgst: 14, sgst: 14, igst: 28, cess: 0, effective_from: "2017-07-01", active: true },
    { code: "GST-0006", name: "GST 28% + 1% Cess", rate: 28, cgst: 14, sgst: 14, igst: 28, cess: 1, effective_from: "2017-07-01", active: true },
  ],
  "payment-terms": [
    { code: "PT-0001", name: "Net 30", applies_to: "BOTH", credit_days: 30, advance_pct: 0, on_delivery_pct: 100, retention_pct: 0, discount_pct: 0, active: true },
    { code: "PT-0002", name: "Net 45", applies_to: "CUSTOMER", credit_days: 45, advance_pct: 0, on_delivery_pct: 100, retention_pct: 0, discount_pct: 0, active: true },
    { code: "PT-0003", name: "Net 60", applies_to: "CUSTOMER", credit_days: 60, advance_pct: 0, on_delivery_pct: 100, retention_pct: 0, discount_pct: 0, active: true },
    { code: "PT-0004", name: "30% Advance / 60% Dispatch / 10% Retention", applies_to: "CUSTOMER", credit_days: 30, advance_pct: 30, on_delivery_pct: 60, retention_pct: 10, discount_pct: 0, active: true },
    { code: "PT-0005", name: "Advance Payment", applies_to: "SUPPLIER", credit_days: 0, advance_pct: 100, on_delivery_pct: 0, retention_pct: 0, discount_pct: 2, active: true },
    { code: "PT-0006", name: "Net 15 with 2% early pay", applies_to: "SUPPLIER", credit_days: 15, advance_pct: 0, on_delivery_pct: 100, retention_pct: 0, discount_pct: 2, active: true },
  ],
  currencies: [
    { code: "CUR-0001", iso_code: "INR", name: "Indian Rupee", symbol: "₹", exchange_rate: 1, rate_date: "2026-08-01", is_base: true, active: true },
    { code: "CUR-0002", iso_code: "USD", name: "US Dollar", symbol: "$", exchange_rate: 87.4, rate_date: "2026-08-01", is_base: false, active: true },
    { code: "CUR-0003", iso_code: "EUR", name: "Euro", symbol: "€", exchange_rate: 95.2, rate_date: "2026-08-01", is_base: false, active: true },
    { code: "CUR-0004", iso_code: "JPY", name: "Japanese Yen", symbol: "¥", exchange_rate: 0.58, rate_date: "2026-08-01", is_base: false, active: true },
    { code: "CUR-0005", iso_code: "GBP", name: "Pound Sterling", symbol: "£", exchange_rate: 111.3, rate_date: "2026-08-01", is_base: false, active: true },
  ],
  "item-categories": [
    { code: "ICT-0001", name: "Raw Material", parent: "", valuation_method: "MAVG", default_hsn: "72091790", active: true },
    { code: "ICT-0002", name: "Sheet Metal", parent: "Raw Material", valuation_method: "MAVG", default_hsn: "72091790", active: true },
    { code: "ICT-0003", name: "Bought-out Components", parent: "", valuation_method: "FIFO", default_hsn: "84123190", active: true },
    { code: "ICT-0004", name: "Automation Hardware", parent: "Bought-out Components", valuation_method: "FIFO", default_hsn: "85152900", active: true },
    { code: "ICT-0005", name: "Sub-Assemblies", parent: "", valuation_method: "STD", default_hsn: "87082900", active: true },
    { code: "ICT-0006", name: "Finished Goods", parent: "", valuation_method: "STD", default_hsn: "87082900", active: true },
    { code: "ICT-0007", name: "Consumables", parent: "", valuation_method: "MAVG", default_hsn: "85159000", active: true },
  ],
  warehouses: [
    { code: "WH-0001", name: "Central Raw Material Store", type: "RM", plant: "Pune Plant 1", address: "Gat 214, Chakan MIDC Phase II, Pune 410501", gstin: "27AAFCF1234M1ZR", incharge: "Mahesh Patil", capacity_sqm: 2400, active: true },
    { code: "WH-0002", name: "WIP Store - Weld Shop", type: "WIP", plant: "Pune Plant 1", address: "Bay A, Chakan MIDC Phase II, Pune", gstin: "27AAFCF1234M1ZR", incharge: "Sneha Deshpande", capacity_sqm: 900, active: true },
    { code: "WH-0003", name: "Finished Goods Warehouse", type: "FG", plant: "Pune Plant 1", address: "Dispatch Block, Chakan MIDC, Pune", gstin: "27AAFCF1234M1ZR", incharge: "Rohit Jadhav", capacity_sqm: 1800, active: true },
    { code: "WH-0004", name: "Scrap Yard", type: "SCRAP", plant: "Pune Plant 1", address: "Rear Yard, Chakan MIDC, Pune", incharge: "Sunil More", capacity_sqm: 400, active: true },
    { code: "WH-0005", name: "Bonded Store - Imports", type: "BOND", plant: "Chennai Unit", address: "Oragadam Industrial Corridor, Chennai 602105", gstin: "33AAFCF1234M1ZP", incharge: "Karthik Raman", capacity_sqm: 700, active: true },
  ],
  "storage-bins": [
    { code: "BIN-0001", name: "RM-A-01-01", warehouse: "WH-0001", bin_type: "PALLET", zone: "A", rack: "01", level: "01", max_weight_kg: 1500, active: true },
    { code: "BIN-0002", name: "RM-A-01-02", warehouse: "WH-0001", bin_type: "PALLET", zone: "A", rack: "01", level: "02", max_weight_kg: 1500, active: true },
    { code: "BIN-0003", name: "RM-B-04-01", warehouse: "WH-0001", bin_type: "SHELF", zone: "B", rack: "04", level: "01", max_weight_kg: 300, active: true },
    { code: "BIN-0004", name: "WIP-W-02-01", warehouse: "WH-0002", bin_type: "FLOOR", zone: "W", rack: "02", level: "01", max_weight_kg: 2500, active: true },
    { code: "BIN-0005", name: "FG-D-01-01", warehouse: "WH-0003", bin_type: "PALLET", zone: "D", rack: "01", level: "01", max_weight_kg: 2000, active: true },
    { code: "BIN-0006", name: "FG-D-02-03", warehouse: "WH-0003", bin_type: "CAGE", zone: "D", rack: "02", level: "03", max_weight_kg: 800, active: true },
    { code: "BIN-0007", name: "BND-I-01-01", warehouse: "WH-0005", bin_type: "SHELF", zone: "I", rack: "01", level: "01", max_weight_kg: 600, active: true },
  ],
  "cost-centres": [
    { code: "CC-0001", name: "Weld Shop", type: "PROD", parent: "Manufacturing", owner: "Sneha Deshpande", annual_budget: 42000000, active: true },
    { code: "CC-0002", name: "Machine Shop", type: "PROD", parent: "Manufacturing", owner: "Mahesh Patil", annual_budget: 28000000, active: true },
    { code: "CC-0003", name: "Design & Engineering", type: "RND", parent: "Corporate", owner: "Rajesh Kulkarni", annual_budget: 19000000, active: true },
    { code: "CC-0004", name: "Project Delivery", type: "PROJ", parent: "Corporate", owner: "Rajesh Kulkarni", annual_budget: 65000000, active: true },
    { code: "CC-0005", name: "Sales & Marketing", type: "SALES", parent: "Corporate", owner: "Priya Nair", annual_budget: 11000000, active: true },
    { code: "CC-0006", name: "Corporate Overheads", type: "OH", parent: "Corporate", owner: "Vikram Chauhan", annual_budget: 15000000, active: true },
  ],
  "ledger-groups": [
    { code: "LG-0001", name: "Fixed Assets", nature: "ASSET", statement: "BS", parent: "", active: true },
    { code: "LG-0002", name: "Current Assets", nature: "ASSET", statement: "BS", parent: "", active: true },
    { code: "LG-0003", name: "Sundry Debtors", nature: "ASSET", statement: "BS", parent: "Current Assets", active: true },
    { code: "LG-0004", name: "Sundry Creditors", nature: "LIABILITY", statement: "BS", parent: "", active: true },
    { code: "LG-0005", name: "Share Capital & Reserves", nature: "EQUITY", statement: "BS", parent: "", active: true },
    { code: "LG-0006", name: "Direct Income", nature: "INCOME", statement: "PL", parent: "", active: true },
    { code: "LG-0007", name: "Material Consumption", nature: "EXPENSE", statement: "PL", parent: "", active: true },
    { code: "LG-0008", name: "Employee Benefit Expense", nature: "EXPENSE", statement: "PL", parent: "", active: true },
    { code: "LG-0009", name: "Manufacturing Overheads", nature: "EXPENSE", statement: "PL", parent: "", active: true },
  ],
  departments: [
    { code: "DEP-0001", name: "Engineering", head: "Rajesh Kulkarni", cost_centre: "CC-0003", location: "Pune Plant 1", headcount: 24, active: true },
    { code: "DEP-0002", name: "Production", head: "Sneha Deshpande", cost_centre: "CC-0001", location: "Pune Plant 1", headcount: 68, active: true },
    { code: "DEP-0003", name: "Quality Assurance", head: "Imran Shaikh", cost_centre: "CC-0002", location: "Pune Plant 1", headcount: 14, active: true },
    { code: "DEP-0004", name: "Sales & Marketing", head: "Priya Nair", cost_centre: "CC-0005", location: "Pune HO", headcount: 9, active: true },
    { code: "DEP-0005", name: "Finance & Accounts", head: "Vikram Chauhan", cost_centre: "CC-0006", location: "Pune HO", headcount: 7, active: true },
    { code: "DEP-0006", name: "Human Resources", head: "Anita Rane", cost_centre: "CC-0006", location: "Pune HO", headcount: 5, active: true },
    { code: "DEP-0007", name: "Supply Chain", head: "Karthik Raman", cost_centre: "CC-0006", location: "Chennai Unit", headcount: 12, active: true },
  ],
  designations: [
    { code: "DSG-0001", title: "Managing Director", department: "Corporate", grade: "B5", reports_to: "Board", approval_limit: 50000000, active: true },
    { code: "DSG-0002", title: "Head - Engineering", department: "Engineering", grade: "B4", reports_to: "Managing Director", approval_limit: 5000000, active: true },
    { code: "DSG-0003", title: "Production Manager", department: "Production", grade: "B3", reports_to: "Managing Director", approval_limit: 2000000, active: true },
    { code: "DSG-0004", title: "Quality Lead", department: "Quality Assurance", grade: "B3", reports_to: "Managing Director", approval_limit: 500000, active: true },
    { code: "DSG-0005", title: "Key Account Manager", department: "Sales & Marketing", grade: "B3", reports_to: "Managing Director", approval_limit: 1000000, active: true },
    { code: "DSG-0006", title: "Senior Design Engineer", department: "Engineering", grade: "B2", reports_to: "Head - Engineering", approval_limit: 200000, active: true },
    { code: "DSG-0007", title: "Shop Floor Supervisor", department: "Production", grade: "B2", reports_to: "Production Manager", approval_limit: 100000, active: true },
    { code: "DSG-0008", title: "Graduate Engineer Trainee", department: "Engineering", grade: "B1", reports_to: "Senior Design Engineer", approval_limit: 0, active: true },
  ],
};

/** Seed a single master (only when it has no records yet). Returns rows created. */
export function seedMaster(masterKey: string) {
  const def = findMaster(masterKey);
  const rows = MASTER_SEEDS[masterKey];
  if (!def || !rows?.length) return 0;
  if (mdmStore.list(masterKey).length > 0) return 0;
  return mdmStore.bulkImport(def, rows, "System Seed");
}

/** Idempotent: seeds every master once per browser. */
export function ensureMasterSeeds() {
  if (typeof window === "undefined") return;
  try {
    if (localStorage.getItem(SEED_FLAG)) return;
    MASTERS.forEach((m) => seedMaster(m.key));
    localStorage.setItem(SEED_FLAG, new Date().toISOString());
  } catch {
    /* storage unavailable — skip seeding */
  }
}
