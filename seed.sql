-- ຂໍ້ມູນຕົວຢ່າງສຳລັບເລີ່ມຕົ້ນໃຊ້ງານ
INSERT OR IGNORE INTO locations (code, name, is_default) VALUES
  ('MAIN', 'ສາງກາງ', 1),
  ('SHOP', 'ຮ້ານຄ້າ', 0),
  ('OFFC', 'ສຳນັກງານ', 0);

INSERT OR IGNORE INTO products (sku, barcode, name, category, unit, min_qty) VALUES
  ('SKU-0001', '8850001000018', 'ປາກກາລູກລື່ນ ສີຟ້າ 0.5', 'ເຄື່ອງຂຽນ', 'ດ້າມ', 20),
  ('SKU-0002', '8850001000025', 'ເຈ້ຍ A4 80 ແກຣມ', 'ເຄື່ອງຂຽນ', 'ຣີມ', 10),
  ('SKU-0003', '8850001000032', 'ໝຶກພິມ HP 680 ສີດຳ', 'ອຸປະກອນໄອທີ', 'ຕະລັບ', 3),
  ('SKU-0004', '8850001000049', 'ສາຍແລນ CAT6 ຍາວ 5 ແມັດ', 'ອຸປະກອນໄອທີ', 'ເສັ້ນ', 5),
  ('SKU-0005', '8850001000056', 'ນ້ຳຢາທຳຄວາມສະອາດພື້ນ', 'ຂອງໃຊ້ສຳນັກງານ', 'ຂວດ', 6),
  ('SKU-0006', '8850001000063', 'ຖົງມືຢາງ ໄຊສ໌ M', 'ຂອງໃຊ້ສຳນັກງານ', 'ກ່ອງ', 4);

INSERT OR IGNORE INTO stock_levels (product_id, location_id, qty)
SELECT p.id, l.id,
  CASE WHEN l.code = 'MAIN' THEN 40 WHEN l.code = 'SHOP' THEN 8 ELSE 2 END
FROM products p CROSS JOIN locations l;
