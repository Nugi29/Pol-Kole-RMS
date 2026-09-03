-- =============================================================================
-- POL-KOLE RESORT & RESTAURANT MANAGEMENT SYSTEM (RMS)
-- Authentic Sri Lankan Restaurant Sample & Demonstration Database Seed Data
-- =============================================================================
-- Note: Constant / Lookup tables (order_status, payment_methods, table_locations,
-- room_types, taxes, userroles, userstatus, restaurant_settings) are NOT modified.
-- =============================================================================

USE `pol-kole-db`;

-- -----------------------------------------------------------------------------
-- 1. AUTHENTIC SRI LANKAN MENU ITEMS (~20 New Additions)
-- -----------------------------------------------------------------------------
INSERT INTO `menu_items` (`id`, `category_id`, `name`, `description`, `price`, `preparation_time`, `image_url`, `is_available`, `is_deleted`) VALUES
(14, 1, 'Egg Hoppers with Lunu Miris & Seeni Sambol (4 pcs)', 'Crispy bowl-shaped fermented rice hoppers with soft steamed egg centers, served with fresh spicy red lunu miris and caramelized seeni sambol.', 550.00, 12, 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600', b'1', b'0'),
(15, 1, 'String Hoppers (Idiyappam 10 pcs) with Kiri Hodi & Pol Sambol', 'Steamed red and white rice flour noodle nests served with aromatic coconut milk kiri hodi, fresh scraped pol sambol, and dhal curry.', 650.00, 15, 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=600', b'1', b'0'),
(16, 1, 'Southern Style Black Pork Curry with Steamed Rice', 'Tender pork cubes slow-cooked in traditional roasted southern spices, goraka, toasted coconut, and crushed black pepper with samba rice.', 1650.00, 25, 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600', b'1', b'0'),
(17, 1, 'Miris Malu (Spicy Sour Fish Ambul Thiyal)', 'Classic sour and peppery dry fish curry made with fresh yellowfin tuna, dried goraka, black pepper, and curry leaves with steamed rice.', 1450.00, 20, 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=600', b'1', b'0'),
(18, 1, 'Pittu with Spicy Babath Curry & Coconut Milk', 'Steamed roasted rice flour and coconut cylinders served with authentic spicy tripe (babath) curry and sweet-thick coconut milk.', 1350.00, 18, 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600', b'1', b'0'),
(19, 1, 'Pol Roti with Lunu Miris & Katta Sambol (3 pcs)', 'Thick coconut flatbreads toasted golden-brown on a flat griddle, served with crushed chili lunu miris and spicy maldive fish katta sambol.', 500.00, 10, 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600', b'1', b'0'),
(20, 2, 'Mutton Kottu Special with Thick Gravy', 'Fresh godamba roti diced on the hot iron griddle with spiced mutton, farm eggs, fresh leeks, carrots, green chilies, and aromatic mutton gravy.', 1950.00, 15, 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=600', b'1', b'0'),
(21, 2, 'Dolphin Kottu with Roast Chicken & Melted Cheese', 'Fluffy parotta chunks tossed on the griddle with pulled roast chicken, creamy melted mozzarella cheese, green chilies, and rich curry sauce.', 2100.00, 18, 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600', b'1', b'0'),
(22, 2, 'String Hopper Kottu with Mixed Seafood', 'Delicate steamed string hoppers tossed with jumbo prawns, cuttlefish rings, eggs, sliced onions, and savory spicy seafood curry reduction.', 1850.00, 15, 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600', b'1', b'0'),
(23, 2, 'Vegetable & Egg Cheese Kottu', 'Fresh shredded farm vegetables, farm-fresh eggs, chopped godamba roti, and creamy cheddar cheese tossed with Sri Lankan roasted curry powder.', 1250.00, 12, 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600', b'1', b'0'),
(24, 3, 'Negombo Butter Garlic Jumbo Prawns', 'Fresh ocean jumbo prawns sauteed in rich golden garlic butter, fresh green chilies, curry leaves, and a squeeze of fresh lime.', 3200.00, 20, 'https://images.unsplash.com/photo-1559742811-822873691df8?w=600', b'1', b'0'),
(25, 3, 'Hot Butter Cuttlefish (Crispy HBC)', 'Signature crispy batter-fried fresh cuttlefish rings tossed with salted butter, spring onions, capsicums, dried chili flakes, and garlic.', 2400.00, 15, 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=600', b'1', b'0'),
(26, 3, 'Mirissa Grilled Red Snapper with Spicy Sambol', 'Whole fresh red snapper marinated in turmeric, lime, crushed garlic, and grilled over coconut charcoal with tomato-onion salsa.', 2900.00, 25, 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600', b'1', b'0'),
(27, 3, 'Devilled Prawns with Banana Capsicum & Onions', 'Juicy king prawns wok-charred in sweet-spicy chili-garlic glaze with crunchy banana peppers, red onions, and ripe tomato wedges.', 2600.00, 18, 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=600', b'1', b'0'),
(28, 4, 'Ceylon Spiced Ginger Milk Tea (Pot)', 'Freshly brewed single-origin Ceylon black tea simmered with crushed fresh ginger root, green cardamom, and rich creamy milk.', 550.00, 8, 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600', b'1', b'0'),
(29, 4, 'Fresh Passion Fruit & Mint Mojito (Virgin)', 'Wild local passion fruit pulp muddled with garden mint leaves, fresh lime wedges, organic sugar syrup, and fizzy soda water.', 750.00, 5, 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600', b'1', b'0'),
(30, 4, 'Avocado Honey & Cashew Nut Shake', 'Velvety local butter avocado blended with pure kithul/wild bee honey, fresh full-cream milk, and crushed roasted cashews.', 850.00, 6, 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=600', b'1', b'0'),
(31, 4, 'Iced Faluda with Basil Seeds & Vanilla Ice Cream', 'Fragrant rose syrup beverage layered with chilled milk, basil (kasakasa) seeds, jelly cubes, and topped with premium vanilla ice cream.', 650.00, 5, 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600', b'1', b'0'),
(32, 5, 'Sri Lankan Bibikkan (Coconut Jaggery Spiced Cake)', 'Rich heritage dark cake baked with freshly grated coconut, dark kithul jaggery, roasted semolina, roasted cashews, and sweet spices.', 650.00, 8, 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600', b'1', b'0'),
(33, 8, 'Grand Sri Lankan Seafood Feast Combo for Two', 'Ultimate coastal feast featuring Jaffna Crab Curry, Hot Butter Cuttlefish, Butter Garlic Prawns, 2 Garlic Steamed Rices, and 2 Fresh King Coconuts.', 6800.00, 30, 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=600', b'1', b'0')
ON DUPLICATE KEY UPDATE
  `category_id` = VALUES(`category_id`),
  `name` = VALUES(`name`),
  `description` = VALUES(`description`),
  `price` = VALUES(`price`),
  `preparation_time` = VALUES(`preparation_time`),
  `image_url` = VALUES(`image_url`),
  `is_available` = VALUES(`is_available`),
  `is_deleted` = VALUES(`is_deleted`);

-- -----------------------------------------------------------------------------
-- 2. NEW CUSTOMERS (Sri Lankan Guests & Patrons)
-- -----------------------------------------------------------------------------
INSERT INTO `customers` (`id`, `name`, `nic_passport`, `email`, `phone`, `address`, `nationality`, `loyalty_points`, `created_at`, `is_deleted`) VALUES
(8, 'Kasun Wickramasinghe', '198845123987', 'kasun.w@gmail.com', '0771234567', 'No 45, Flower Road, Colombo 07', 'Sri Lankan', 120, NOW(6), b'0'),
(9, 'Dilani Perera', '199365412890', 'dilani.p@yahoo.com', '0719876543', 'No 12, Peradeniya Road, Kandy', 'Sri Lankan', 85, NOW(6), b'0'),
(10, 'Tharindu Senanayake', '199611223344', 'tharindu.s@outlook.com', '0765544332', 'No 88, Light House Street, Galle', 'Sri Lankan', 210, NOW(6), b'0'),
(11, 'Hansika Bandara', '200055443322', 'hansika.b@gmail.com', '0783322110', 'No 24, Beach Road, Negombo', 'Sri Lankan', 45, NOW(6), b'0')
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `email` = VALUES(`email`),
  `phone` = VALUES(`phone`),
  `address` = VALUES(`address`),
  `nationality` = VALUES(`nationality`),
  `loyalty_points` = VALUES(`loyalty_points`);

-- -----------------------------------------------------------------------------
-- 3. PROMOTIONAL ITEM DISCOUNTS FOR NEW SRI LANKAN SPECIALTIES
-- -----------------------------------------------------------------------------
INSERT INTO `item_discounts` (`id`, `title`, `menu_item_id`, `discount_type`, `discount_value`, `start_date`, `end_date`, `is_active`, `is_deleted`) VALUES
(6, 'Southern Black Pork Curry Launch 10% Off', 16, 'PERCENTAGE', 10.00, '2026-01-01', '2026-12-31', b'1', b'0'),
(7, 'Crispy HBC Weekend Special Rs. 200 Off', 25, 'FIXED_OFF', 200.00, '2026-01-01', '2026-12-31', b'1', b'0'),
(8, 'Grand Seafood Feast Introductory Saver Deal', 33, 'SPECIAL_PRICE', 6200.00, '2026-01-01', '2026-12-31', b'1', b'0')
ON DUPLICATE KEY UPDATE
  `title` = VALUES(`title`),
  `menu_item_id` = VALUES(`menu_item_id`),
  `discount_type` = VALUES(`discount_type`),
  `discount_value` = VALUES(`discount_value`),
  `start_date` = VALUES(`start_date`),
  `end_date` = VALUES(`end_date`),
  `is_active` = VALUES(`is_active`);

-- -----------------------------------------------------------------------------
-- 4. NEW SAMPLE ORDERS (Dine-in, Room Service, Takeaway)
-- -----------------------------------------------------------------------------
INSERT INTO `orders` (`id`, `customer_id`, `table_id`, `room_id`, `assigned_waiter_id`, `status_id`, `order_time`, `total_amount`, `notes`, `is_deleted`) VALUES
-- Order 39: Dine-in Table 2 (T-02), Customer Kasun, Waiter 1 (ID 4), Completed
(39, 8, 2, NULL, 4, 4, '2026-09-02 12:30:00.000000', 4350.00, 'Extra spicy kottu with thick gravy on the side', b'0'),

-- Order 40: VIP Dine-in Table 6 (T-VIP-01), Customer Tharindu, Waiter 2 (ID 5), Completed
(40, 10, 6, NULL, 5, 4, '2026-09-02 19:15:00.000000', 7900.00, 'VIP guest - serve hot butter cuttlefish very crispy with extra lime', b'0'),

-- Order 41: Room Service Room 3 (201 - Ocean View), Customer Dilani, Waiter 1 (ID 4), Completed
(41, 9, NULL, 3, 4, 4, '2026-09-03 08:30:00.000000', 3100.00, 'Room service breakfast tray with extra seeni sambol', b'0'),

-- Order 42: Takeaway Counter Order, Customer Hansika, Completed
(42, 11, NULL, NULL, NULL, 4, '2026-09-03 11:15:00.000000', 3200.00, 'Takeaway packed in banana leaf wrap boxes', b'0'),

-- Order 43: Active Dine-in Table 3 (T-03 - Garden Pavillion), Waiter 2 (ID 5), Preparing
(43, 8, 3, NULL, 5, 2, '2026-09-03 13:45:00.000000', 5650.00, 'Jumbo prawns with extra garlic butter; mango avocado shake chilled', b'0'),

-- Order 44: Active Dine-in Table 1 (T-01 - Indoor Dining Hall), Waiter 1 (ID 4), Ready to Serve
(44, 10, 1, NULL, 4, 6, '2026-09-03 14:00:00.000000', 3200.00, 'Fresh string hoppers and fish ambul thiyal lunch', b'0')
ON DUPLICATE KEY UPDATE
  `customer_id` = VALUES(`customer_id`),
  `table_id` = VALUES(`table_id`),
  `room_id` = VALUES(`room_id`),
  `assigned_waiter_id` = VALUES(`assigned_waiter_id`),
  `status_id` = VALUES(`status_id`),
  `order_time` = VALUES(`order_time`),
  `total_amount` = VALUES(`total_amount`),
  `notes` = VALUES(`notes`);

-- -----------------------------------------------------------------------------
-- 5. NEW ORDER ITEMS
-- -----------------------------------------------------------------------------
INSERT INTO `order_items` (`id`, `order_id`, `menu_item_id`, `quantity`, `price`, `notes`) VALUES
-- Items for Order 39 (Total = 1950 + 2400 = 4350)
(61, 39, 20, 1, 1950.00, 'Mutton Kottu with extra spicy gravy'),
(62, 39, 25, 1, 2400.00, 'Hot Butter Cuttlefish (Crispy HBC)'),

-- Items for Order 40 (Total = 6800 + 550 + 550 = 7900)
(63, 40, 33, 1, 6800.00, 'Grand Sri Lankan Seafood Feast Combo for Two'),
(64, 40, 28, 1, 550.00, 'Ceylon Spiced Ginger Milk Tea'),
(65, 40, 7, 1, 550.00, 'Traditional Watalappan dessert'),

-- Items for Order 41 (Total = 1650 + 550 + 750 + 150 = 3100)
(66, 41, 16, 1, 1650.00, 'Southern Style Black Pork Curry with Rice'),
(67, 41, 14, 1, 550.00, 'Egg Hoppers with Lunu Miris & Seeni Sambol'),
(68, 41, 29, 1, 750.00, 'Fresh Passion Fruit & Mint Mojito'),
(69, 41, 5, 1, 150.00, 'Ceylon Cardamom Tea cup'),

-- Items for Order 42 (Total = 2100 + 500 + 600 = 3200)
(70, 42, 21, 1, 2100.00, 'Dolphin Kottu with Roast Chicken & Melted Cheese'),
(71, 42, 19, 1, 500.00, 'Pol Roti with Lunu Miris & Katta Sambol (3 pcs)'),
(72, 42, 31, 1, 600.00, 'Iced Faluda with Basil Seeds & Ice Cream'),

-- Items for Order 43 (Total = 3200 + 1850 + 600 = 5650)
(73, 43, 24, 1, 3200.00, 'Negombo Butter Garlic Jumbo Prawns'),
(74, 43, 22, 1, 1850.00, 'String Hopper Kottu with Mixed Seafood'),
(75, 43, 30, 1, 600.00, 'Avocado Honey & Cashew Nut Shake'),

-- Items for Order 44 (Total = 650 + 1450 + 550 + 550 = 3200)
(76, 44, 15, 1, 650.00, 'String Hoppers (10 pcs) with Kiri Hodi & Pol Sambol'),
(77, 44, 17, 1, 1450.00, 'Miris Malu (Spicy Sour Fish Ambul Thiyal)'),
(78, 44, 32, 1, 550.00, 'Sri Lankan Bibikkan Cake'),
(79, 44, 28, 1, 550.00, 'Ceylon Spiced Ginger Milk Tea')
ON DUPLICATE KEY UPDATE
  `order_id` = VALUES(`order_id`),
  `menu_item_id` = VALUES(`menu_item_id`),
  `quantity` = VALUES(`quantity`),
  `price` = VALUES(`price`),
  `notes` = VALUES(`notes`);

-- -----------------------------------------------------------------------------
-- 6. REAL-TIME KITCHEN ORDERS / TICKETS (KDS)
-- -----------------------------------------------------------------------------
INSERT INTO `kitchen_orders` (`id`, `order_id`, `assigned_chef_id`, `station`, `preparation_status`, `preparation_timer`, `start_time`, `end_time`) VALUES
(39, 39, 6, 'Grill & Kottu Station', 'DELIVERED', 18, '2026-09-02 12:30:00.000000', '2026-09-02 12:48:00.000000'),
(40, 40, 7, 'Seafood & Appitizers', 'DELIVERED', 30, '2026-09-02 19:15:00.000000', '2026-09-02 19:46:00.000000'),
(41, 41, 6, 'Main Hot Kitchen & Curry', 'DELIVERED', 25, '2026-09-03 08:30:00.000000', '2026-09-03 08:55:00.000000'),
(42, 42, 7, 'Grill & Kottu Station', 'DELIVERED', 18, '2026-09-03 11:15:00.000000', '2026-09-03 11:32:00.000000'),
(43, 43, 6, 'Seafood & Appitizers', 'PREPARING', 20, '2026-09-03 13:45:00.000000', NULL),
(44, 44, 7, 'Main Hot Kitchen & Curry', 'READY', 15, '2026-09-03 14:00:00.000000', '2026-09-03 14:15:00.000000')
ON DUPLICATE KEY UPDATE
  `assigned_chef_id` = VALUES(`assigned_chef_id`),
  `station` = VALUES(`station`),
  `preparation_status` = VALUES(`preparation_status`),
  `preparation_timer` = VALUES(`preparation_timer`),
  `start_time` = VALUES(`start_time`),
  `end_time` = VALUES(`end_time`);

-- -----------------------------------------------------------------------------
-- 7. BILLING INVOICES (VAT 15% + Service Charge 10% = 25% Tax)
-- -----------------------------------------------------------------------------
INSERT INTO `invoices` (`id`, `order_id`, `hotel_reservation_id`, `table_reservation_id`, `invoice_number`, `order_subtotal`, `discount_amount`, `tax_amount`, `total_amount`, `payment_status`, `created_at`, `updated_at`, `created_by`) VALUES
-- Invoice for Order 39
(40, 39, NULL, NULL, 'INV-T-20260902-001', 4350.00, 0.00, 1087.50, 5437.50, 'PAID', '2026-09-02 13:00:00.000000', '2026-09-02 13:15:00.000000', 'test@pk.com'),

-- Invoice for Order 40 (With Rs. 790 Promo Discount)
(41, 40, NULL, NULL, 'INV-T-20260902-002', 7900.00, 790.00, 1777.50, 8887.50, 'PAID', '2026-09-02 20:00:00.000000', '2026-09-02 20:30:00.000000', 'test@pk.com'),

-- Invoice for Order 41 (Room Service)
(42, 41, NULL, NULL, 'INV-R-20260903-001', 3100.00, 0.00, 775.00, 3875.00, 'PAID', '2026-09-03 09:00:00.000000', '2026-09-03 09:20:00.000000', 'test@pk.com'),

-- Invoice for Order 42 (Takeaway)
(43, 42, NULL, NULL, 'INV-TA-20260903-001', 3200.00, 0.00, 800.00, 4000.00, 'PAID', '2026-09-03 11:30:00.000000', '2026-09-03 11:35:00.000000', 'test@pk.com')
ON DUPLICATE KEY UPDATE
  `order_subtotal` = VALUES(`order_subtotal`),
  `discount_amount` = VALUES(`discount_amount`),
  `tax_amount` = VALUES(`tax_amount`),
  `total_amount` = VALUES(`total_amount`),
  `payment_status` = VALUES(`payment_status`),
  `updated_at` = VALUES(`updated_at`);

-- -----------------------------------------------------------------------------
-- 8. INVOICE ITEMIZED BREAKDOWNS
-- -----------------------------------------------------------------------------
INSERT INTO `invoice_items` (`id`, `invoice_id`, `description`, `quantity`, `unit_price`, `total_price`) VALUES
-- Items for Invoice 40
(69, 40, 'Mutton Kottu Special with Thick Gravy', 1, 1950.00, 1950.00),
(70, 40, 'Hot Butter Cuttlefish (Crispy HBC)', 1, 2400.00, 2400.00),

-- Items for Invoice 41
(71, 41, 'Grand Sri Lankan Seafood Feast Combo for Two', 1, 6800.00, 6800.00),
(72, 41, 'Ceylon Spiced Ginger Milk Tea', 1, 550.00, 550.00),
(73, 41, 'Traditional Watalappan', 1, 550.00, 550.00),

-- Items for Invoice 42
(74, 42, 'Southern Style Black Pork Curry with Steamed Rice', 1, 1650.00, 1650.00),
(75, 42, 'Egg Hoppers with Lunu Miris & Seeni Sambol', 1, 550.00, 550.00),
(76, 42, 'Fresh Passion Fruit & Mint Mojito (Virgin)', 1, 750.00, 750.00),
(77, 42, 'Ceylon Cardamom Tea cup', 1, 150.00, 150.00),

-- Items for Invoice 43
(78, 43, 'Dolphin Kottu with Roast Chicken & Melted Cheese', 1, 2100.00, 2100.00),
(79, 43, 'Pol Roti with Lunu Miris & Katta Sambol (3 pcs)', 1, 500.00, 500.00),
(80, 43, 'Iced Faluda with Basil Seeds & Vanilla Ice Cream', 1, 600.00, 600.00)
ON DUPLICATE KEY UPDATE
  `invoice_id` = VALUES(`invoice_id`),
  `description` = VALUES(`description`),
  `quantity` = VALUES(`quantity`),
  `unit_price` = VALUES(`unit_price`),
  `total_price` = VALUES(`total_price`);

-- -----------------------------------------------------------------------------
-- 9. PAYMENT TRANSACTIONS (Cash, Card, LankaQR)
-- -----------------------------------------------------------------------------
INSERT INTO `payments` (`id`, `invoice_id`, `amount`, `payment_method_id`, `payment_date`, `transaction_reference`, `notes`, `created_by`) VALUES
(30, 40, 5437.50, 2, '2026-09-02 13:15:00.000000', 'TXN-CARD-883921', 'Settled via Visa Platinum at Table 2', 'test@pk.com'),
(31, 41, 8887.50, 3, '2026-09-02 20:30:00.000000', 'LQR-994821034', 'Settled via LankaQR Commercial Bank at VIP Table', 'test@pk.com'),
(32, 42, 3875.00, 1, '2026-09-03 09:20:00.000000', 'CASH-REC-0042', 'Cash settlement for Room 201 breakfast service', 'test@pk.com'),
(33, 43, 4000.00, 2, '2026-09-03 11:35:00.000000', 'TXN-CARD-449102', 'MasterCard contactless tap at takeaway counter', 'test@pk.com')
ON DUPLICATE KEY UPDATE
  `invoice_id` = VALUES(`invoice_id`),
  `amount` = VALUES(`amount`),
  `payment_method_id` = VALUES(`payment_method_id`),
  `payment_date` = VALUES(`payment_date`),
  `transaction_reference` = VALUES(`transaction_reference`),
  `notes` = VALUES(`notes`);
