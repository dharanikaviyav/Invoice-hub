-- schema.sql
DROP DATABASE IF EXISTS invoice_hub;
CREATE DATABASE invoice_hub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE invoice_hub;

-- CLIENTS
CREATE TABLE clients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_clients_name (name)
) ENGINE=InnoDB;

-- ITEMS / PRODUCTS
CREATE TABLE items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    gst_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_items_name (name)
) ENGINE=InnoDB;

-- INVOICES
CREATE TABLE invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE,
    client_id INT NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    status ENUM('Draft','Pending','Paid') NOT NULL DEFAULT 'Draft',
    billing_address TEXT,
    notes TEXT,
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
    tax_total DECIMAL(12,2) NOT NULL DEFAULT 0,
    grand_total DECIMAL(12,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_invoices_client FOREIGN KEY (client_id)
        REFERENCES clients(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- INVOICE ITEMS
CREATE TABLE invoice_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_id INT NOT NULL,
    item_id INT NULL,
    item_name VARCHAR(255) NOT NULL,
    quantity DECIMAL(12,2) NOT NULL DEFAULT 1,
    unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    gst_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
    CONSTRAINT fk_invoice_items_invoice FOREIGN KEY (invoice_id)
        REFERENCES invoices(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_invoice_items_item FOREIGN KEY (item_id)
        REFERENCES items(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- SEED CLIENTS
INSERT INTO clients (name, email, address) VALUES
('TCS', 'billing@tcs.com', 'Tata Consultancy Services\nMumbai, India'),
('Infosys', 'billing@infosys.com', 'Infosys Limited\nBengaluru, India'),
('Wipro', 'billing@wipro.com', 'Wipro Ltd\nBengaluru, India');

-- SEED ITEMS
INSERT INTO items (name, unit_price, gst_percent) VALUES
('Web Development Service', 25000.00, 18.00),
('Mobile App Development', 40000.00, 18.00),
('Maintenance & Support', 8000.00, 18.00);
