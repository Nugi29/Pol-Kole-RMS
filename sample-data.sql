-- Pol-Kole Resort & Restaurant Management System Sample Data for Sri Lanka
-- Ensure the database is selected
USE `pol-kole-db`;

-- Disable foreign key checks to allow clean truncation/inserts if needed
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Populate userstatus
TRUNCATE TABLE `userstatus`;
INSERT INTO `userstatus` (`id`, `name`) VALUES
(1, 'Active'),
(2, 'Inactive');

-- 2. Populate userroles
TRUNCATE TABLE `userroles`;
INSERT INTO `userroles` (`id`, `name`) VALUES
(1, 'Admin'),
(2, 'Manager'),
(3, 'Receptionist'),
(4, 'Chef'),
(5, 'Waiter');

-- Ensure users table exists and populate it
CREATE TABLE IF NOT EXISTS `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(100) UNIQUE,
    `password` VARCHAR(255) NOT NULL,
    `phone` VARCHAR(20),
    `role_id` INT,
    `userstatus_id` INT,
    `created_at` DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    FOREIGN KEY (`role_id`) REFERENCES `userroles`(`id`),
    FOREIGN KEY (`userstatus_id`) REFERENCES `userstatus`(`id`)
);

TRUNCATE TABLE `users`;
-- Passwords are set to 'password123' (bcrypt/plain text for dev)
INSERT INTO `users` (`id`, `name`, `email`, `password` , `phone`, `role_id`, `userstatus_id`) VALUES
(1, 'Chathura Silva', 'chathura@polkole.lk', 'password123', '+94771112222', 1, 1),
(2, 'Sanduni Perera', 'sanduni@polkole.lk', 'password123', '+94773334444', 2, 1),
(3, 'Dilshan Fernando', 'dilshan@polkole.lk', 'password123', '+94775556666', 3, 1),
(4, 'Priyantha Kumara', 'priyantha@polkole.lk', 'password123', '+94777778888', 4, 1),
(5, 'Kasun Jayawardena', 'kasun@polkole.lk', 'password123', '+94779990000', 5, 1);

-- 3. Populate room_types
TRUNCATE TABLE `room_types`;
INSERT INTO `room_types` (`id`, `name`, `description`, `default_price`, `max_capacity`, `amenities`) VALUES
(1, 'Deluxe Single Room', 'Cozy single room with premium amenities, perfect for solo travelers.', 15000.00, 1, 'AC, Free High-Speed Wi-Fi, Flat-screen TV, Mini Bar, Modern Bathroom, Safe'),
(2, 'Ocean View Double Room', 'Spacious double room featuring a private balcony with breathtaking views of the Indian Ocean.', 25000.00, 2, 'AC, Free High-Speed Wi-Fi, Balcony with Ocean View, Tea/Coffee Maker, King Size Bed'),
(3, 'Luxury Family Suite', 'Grand suite designed for families, including a separate living area and kitchen facilities.', 45000.00, 4, 'AC, Free High-Speed Wi-Fi, Kitchenette, Dining Area, Bathtub, Sofa Bed, Living Room');

-- 4. Populate rooms
TRUNCATE TABLE `rooms`;
INSERT INTO `rooms` (`id`, `room_number`, `room_type_id`, `capacity`, `status`, `is_deleted`) VALUES
(1, '101', 1, 1, 'Available', 0),
(2, '102', 1, 1, 'Available', 0),
(3, '201', 2, 2, 'Available', 0),
(4, '202', 2, 2, 'Available', 0),
(5, '301', 3, 4, 'Available', 0);

-- 5. Populate restaurant_tables
TRUNCATE TABLE `restaurant_tables`;
INSERT INTO `restaurant_tables` (`id`, `table_number`, `capacity`, `location`, `status`, `is_available_for_reservation`, `is_deleted`) VALUES
(1, 'T-01', 2, 'Indoor Dining Hall', 'Available', 1, 0),
(2, 'T-02', 4, 'Terrace with Garden View', 'Available', 1, 0),
(3, 'T-03', 6, 'Garden Pavillion', 'Available', 1, 0),
(4, 'T-04', 2, 'Poolside Lounge', 'Available', 1, 0);

-- 6. Populate menu_categories
TRUNCATE TABLE `menu_categories`;
INSERT INTO `menu_categories` (`id`, `name`, `description`, `is_deleted`) VALUES
(1, 'Sri Lankan Rice & Curry', 'Authentic traditional Sri Lankan rice served with various curries, sambols, and papadums.', 0),
(2, 'Sri Lankan Kottu', 'Freshly chopped kottu roti prepared with vegetables, eggs, cheese, and delicious spices.', 0),
(3, 'Seafood Specialties', 'Freshly caught fish, crabs, cuttlefish, and prawns prepared in traditional local style.', 0),
(4, 'Ceylon Tea & Beverages', 'Premium single-origin Ceylon tea varieties, fresh local fruit juices, and traditional king coconut water.', 0),
(5, 'Traditional Desserts', 'Sweet Sri Lankan local delicacies including homemade watalappan and curd with treacle.', 0),
(6, 'Special Combo Deals & Bundles', 'Value bundle packages and meal combos including food and beverages at discounted rates.', 0);

-- 7. Populate menu_items
TRUNCATE TABLE `menu_items`;
INSERT INTO `menu_items` (`id`, `name`, `description`, `price`, `preparation_time`, `category_id`, `is_available`, `is_deleted`) VALUES
(1, 'Sri Lankan Chicken Rice & Curry', 'Red/White basmati rice served with aromatic Sri Lankan chicken curry, dhal curry, coconut sambol, and papadum.', 1200.00, 20, 1, 1, 0),
(2, 'Cheese & Egg Kottu Roti', 'Popular Sri Lankan street food made with chopped flatbread, eggs, creamy cheese, veggies, and spicy gravy.', 1500.00, 15, 2, 1, 0),
(3, 'Jaffna Crab Curry', 'Local blue lagoon crabs cooked in an authentic, rich, and fiery Jaffna spice blend with drumstick leaves.', 2800.00, 25, 3, 1, 0),
(4, 'Devilled Cuttlefish', 'Stir-fried fresh cuttlefish tossed with bell peppers, onions, banana peppers, and a sweet-spicy local sauce.', 2200.00, 20, 3, 1, 0),
(5, 'Ceylon Cardamom Tea (Pot)', 'Premium BOP Fanning Ceylon tea brewed with fresh cardamom pods, served with local jaggery.', 500.00, 7, 4, 1, 0),
(6, 'Fresh King Coconut (Thambili)', 'Chilled, refreshing premium local king coconut water served fresh in the shell.', 350.00, 3, 4, 1, 0),
(7, 'Traditional Watalappan', 'Steamed rich custard pudding made from organic coconut milk, native kithul jaggery, eggs, and freshly ground spices.', 600.00, 10, 5, 1, 0),
(8, 'Buffalo Curd & Kithul Treacle', 'Creamy local buffalo curd served chilled with sweet, organic kithul palm treacle.', 550.00, 5, 5, 1, 0),
(9, 'Classic Pizza + Coke 1L Combo Deal', 'Includes 1x Large Classic Pizza + 1x 1L Chilled Coca-Cola Bottle (Value Combo Deal - Save Rs. 600)', 1500.00, 20, 6, 1, 0),
(10, 'Double Kottu + 2 Fresh Thambili Combo', 'Includes 2x Cheese & Egg Kottu Roti + 2x Fresh King Coconuts (Save Rs. 500)', 3200.00, 20, 6, 1, 0);

-- 8. Populate customers
TRUNCATE TABLE `customers`;
INSERT INTO `customers` (`id`, `name`, `email`, `phone`, `nic_passport`, `nationality`, `address`, `loyalty_points`, `is_deleted`) VALUES
(1, 'Kamal Silva', 'kamal@gmail.com', '+94712345678', '199012345678', 'Sri Lankan', '125, Galle Road, Colombo 03', 120, 0),
(2, 'Sunila Jayawardena', 'sunila.j@yahoo.com', '+94779876543', '198532165498', 'Sri Lankan', '45, Kandy Road, Peradeniya', 80, 0),
(3, 'Rohan Fernando', 'rohan.fernando@outlook.com', '+94754567890', '199577889900', 'Sri Lankan', '88, Beach Road, Negombo', 250, 0),
(4, 'Emily Watson', 'emily.watson@gmail.com', '+442079460958', 'N98765432', 'British', '12 Baker Street, London, UK', 300, 0);

-- 9. Populate reservation_status
TRUNCATE TABLE `reservation_status`;
INSERT INTO `reservation_status` (`id`, `status_name`, `description`) VALUES
(1, 'Pending', 'Reservation has been requested but not yet confirmed.'),
(2, 'Confirmed', 'Reservation has been confirmed and rooms are blocked.'),
(3, 'Checked In', 'Guests have checked in and occupied the rooms.'),
(4, 'Checked Out', 'Guests have completed their stay and checked out.'),
(5, 'Cancelled', 'Reservation has been cancelled.');

-- 10. Populate order_status
TRUNCATE TABLE `order_status`;
INSERT INTO `order_status` (`id`, `name`) VALUES
(1, 'PENDING'),
(2, 'PREPARING'),
(3, 'SERVED'),
(4, 'COMPLETED'),
(5, 'CANCELLED'),
(6, 'READY');

-- 11. Populate payment_methods
TRUNCATE TABLE `payment_methods`;
INSERT INTO `payment_methods` (`id`, `name`) VALUES
(1, 'Cash'),
(2, 'Credit/Debit Card'),
(3, 'Bank Transfer / LANKAQR');

-- 12. Populate taxes
TRUNCATE TABLE `taxes`;
INSERT INTO `taxes` (`id`, `name`, `percentage`, `active`) VALUES
(1, 'VAT', 15.00, 1),
(2, 'Service Charge', 10.00, 1);

-- 13. Populate vouchers (Promotional Voucher & Coupon Codes applied at Invoice Compiler)
CREATE TABLE IF NOT EXISTS `vouchers` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `code` VARCHAR(30) NOT NULL UNIQUE,
    `description` VARCHAR(255),
    `discount_type` VARCHAR(20) NOT NULL, -- PERCENTAGE, FIXED
    `discount_value` DECIMAL(10, 2) NOT NULL,
    `min_bill_amount` DECIMAL(10, 2) DEFAULT NULL,
    `max_discount_amount` DECIMAL(10, 2) DEFAULT NULL,
    `active_from` DATE NOT NULL,
    `active_to` DATE NOT NULL,
    `usage_limit` INT DEFAULT NULL,
    `usage_count` INT NOT NULL DEFAULT 0,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `applicable_type` VARCHAR(20) DEFAULT 'ALL',
    `is_deleted` TINYINT(1) NOT NULL DEFAULT 0
);

TRUNCATE TABLE `vouchers`;
INSERT INTO `vouchers` (`id`, `code`, `description`, `discount_type`, `discount_value`, `min_bill_amount`, `max_discount_amount`, `active_from`, `active_to`, `usage_limit`, `usage_count`, `is_active`, `applicable_type`, `is_deleted`) VALUES
(1, 'WELCOME10', 'Welcome Guest Promotional 10% Discount', 'PERCENTAGE', 10.00, 1000.00, 2000.00, '2026-01-01', '2026-12-31', 500, 0, 1, 'ALL', 0),
(2, 'VIP20', 'VIP Platinum Guest 20% Special Discount', 'PERCENTAGE', 20.00, 3000.00, 5000.00, '2026-01-01', '2026-12-31', 100, 0, 1, 'ALL', 0),
(3, 'SUMMER500', 'Summer Getaway Flat Rs. 500 Off', 'FIXED', 500.00, 2500.00, NULL, '2026-01-01', '2026-12-31', 200, 0, 1, 'ALL', 0),
(4, 'MANAGER15', 'Manager Approved Discretionary 15% Courtesy Discount', 'PERCENTAGE', 15.00, 500.00, 3000.00, '2026-01-01', '2026-12-31', NULL, 0, 1, 'ALL', 0),
(5, 'SEAFOOD250', 'Seafood Special Rs. 250 Off Voucher', 'FIXED', 250.00, 1500.00, NULL, '2026-01-01', '2026-12-31', 150, 0, 1, 'ALL', 0);

-- 14. Populate item_discounts (Special Time-Period Menu Item Discounts: e.g. Fried rice regular Rs. 1200 -> special price Rs. 1000)
CREATE TABLE IF NOT EXISTS `item_discounts` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `title` VARCHAR(150) NOT NULL,
    `menu_item_id` INT NOT NULL,
    `discount_type` VARCHAR(20) NOT NULL, -- PERCENTAGE, FIXED_OFF, SPECIAL_PRICE
    `discount_value` DECIMAL(10, 2) NOT NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `is_deleted` TINYINT(1) NOT NULL DEFAULT 0,
    FOREIGN KEY (`menu_item_id`) REFERENCES `menu_items`(`id`)
);

TRUNCATE TABLE `item_discounts`;
INSERT INTO `item_discounts` (`id`, `title`, `menu_item_id`, `discount_type`, `discount_value`, `start_date`, `end_date`, `is_active`, `is_deleted`) VALUES
(1, 'Daily Lunch Special Promo', 1, 'SPECIAL_PRICE', 1000.00, '2026-01-01', '2026-12-31', 1, 0),
(2, 'Evening Kottu Madness 20% Off', 2, 'PERCENTAGE', 20.00, '2026-01-01', '2026-12-31', 1, 0),
(3, 'Chef Premium Seafood Special Rs. 300 Off', 3, 'FIXED_OFF', 300.00, '2026-01-01', '2026-12-31', 1, 0);

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;
