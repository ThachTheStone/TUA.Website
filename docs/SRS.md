# TÀI LIỆU ĐẶC TẢ YÊU CẦU PHẦN MỀM (SRS)

**Dự án:** TỰA – Nét Vẽ Yêu Thương
**Phiên bản:** 2.0
**Thời gian phát triển:** 30/09/2026 – 08/10/2026
**Quy mô dự kiến:** khoảng 30 đơn hàng trong chiến dịch
**Ngôn ngữ giao diện:** Tiếng Việt

---

## 1. Giới thiệu

### 1.1. Mục đích
Tài liệu xác định đầy đủ yêu cầu chức năng, phi chức năng, quy tắc nghiệp vụ, mô hình dữ liệu và tích hợp cho website TỰA. Website gây quỹ từ thiện thông qua bán áo thun (áo trơn và áo custom) và nhận quyên góp; toàn bộ lợi nhuận hỗ trợ trẻ em có hoàn cảnh đặc biệt. Tài liệu đồng thời là nguồn tham chiếu cho việc lập trình với AI (Claude Code).

### 1.2. Phạm vi
- **Trang khách hàng (Public site):** xem câu chuyện dự án, Top 5 tranh của các bé, sự kiện và khuyến mãi; thiết kế áo trên canvas; giỏ hàng; đặt hàng và thanh toán cọc qua VietQR; quyên góp; tra cứu đơn; xem Bảng vinh danh nhà hảo tâm và nhà tài trợ.
- **Trang quản trị (Admin Portal):** quản lý đơn hàng, xác nhận thanh toán, cập nhật trạng thái, tạo đơn Workshop thủ công, quản lý quyên góp, quản lý nội dung, quản lý nhà tài trợ, quản lý tài khoản.
- **Tích hợp:** VietQR (sinh mã QR), Google Sheets (bản sao dữ liệu để theo dõi minh bạch), Email (thông báo).

### 1.3. Ngoài phạm vi (phiên bản này)
- Xác nhận thanh toán tự động qua webhook ngân hàng (SePay/Casso) — dự kiến mở rộng sau.
- Tích hợp API đơn vị vận chuyển. Ban tổ chức tự đặt dịch vụ giao hàng bên ngoài.
- Mã giảm giá tự động áp dụng vào giỏ hàng (khuyến mãi hiện chỉ là nội dung hiển thị).
- Tải ảnh từ thiết bị của khách hàng (bị cấm theo BR01).

### 1.4. Thuật ngữ
| Thuật ngữ | Ý nghĩa |
|---|---|
| Áo trơn | Áo không in, giá 99.000đ |
| Áo custom | Áo in bản vẽ của khách, giá 129.000đ |
| Vùng in (Print Area) | Khu vực trên áo cho phép vẽ. Có 3 vùng |
| Cọc | Số tiền khách chuyển trước, tối thiểu 50% tổng đơn |
| Order Code | Mã đơn dạng `TUA0001`, dùng làm nội dung chuyển khoản |
| Donation Code | Mã quyên góp dạng `UH0001` |
| DPI | Số điểm mực trên mỗi inch khi in; quyết định độ nét |

---

## 2. Tổng quan nghiệp vụ

TỰA là nền tảng thương mại điện tử kết hợp gây quỹ cho chiến dịch "Nét Vẽ Yêu Thương". Khách hàng chọn áo trơn hoặc tự thiết kế áo custom trên canvas của website. Tuyệt đối không có tính năng tải ảnh từ thiết bị, nhằm kiểm soát rủi ro bản quyền.

Một đơn hàng có thể chứa nhiều áo. Mỗi áo custom có bản thiết kế riêng. Sau khi thiết kế, khách cam kết bản quyền, điền thông tin và chọn hình thức nhận hàng. Có hai hình thức: giao hàng (khách ở ngoài trường) hoặc nhận tại campus theo lịch hẹn. Khách chọn mức thanh toán trước 50%, 75% hoặc 100%. Hệ thống sinh mã VietQR có sẵn số tiền và nội dung chuyển khoản chứa Order Code. Khách quét mã, chuyển khoản, rồi bấm "Tôi đã chuyển khoản". Staff đối soát thủ công với sao kê ngân hàng và xác nhận.

Khách vẽ tay trên giấy tại Campus Workshop được Staff scan bản vẽ và tạo đơn thủ công trên Admin. Chỉ Staff được phép upload ảnh scan.

Đơn đi qua các trạng thái: Chờ thanh toán → Chờ xác nhận thanh toán → Đã xác nhận → Đang in → Kiểm tra chất lượng → Sẵn sàng giao/nhận → Đã giao. Đơn chưa thanh toán quá hạn sẽ tự động hủy.

Toàn bộ dữ liệu đơn hàng, quyên góp và trạng thái được lưu trong cơ sở dữ liệu chính và đồng bộ sang Google Sheets để Ban tổ chức theo dõi minh bạch.

---

## 3. Tác nhân và phân quyền

| Tác nhân | Mô tả | Quyền |
|---|---|---|
| Khách (Guest) | Người truy cập, không cần đăng nhập | Xem nội dung, thiết kế, đặt hàng, quyên góp, tra cứu đơn |
| Staff | Thành viên Ban tổ chức | Xử lý đơn hàng, xác nhận thanh toán, cập nhật trạng thái, tạo đơn Workshop, xác nhận quyên góp |
| Admin | Trưởng nhóm / quản trị | Toàn bộ quyền của Staff, cộng thêm: quản lý tài khoản, nội dung, nhà tài trợ, cài đặt (giá, thời hạn, tài khoản ngân hàng) |

Số lượng tài khoản Staff không giới hạn. Admin có thể thêm hoặc vô hiệu hóa tài khoản bất kỳ lúc nào.

---

## 4. Yêu cầu chức năng

### 4.1. Phía Khách hàng

**FR01 – Trang chủ và thông tin dự án**
- Hiển thị câu chuyện dự án, Top 5 tranh của các bé, thông tin Campus Workshop, các khuyến mãi đang hoạt động (gian hàng Hotwheels, combo vẽ áo...).
- Toàn bộ nội dung lấy từ cơ sở dữ liệu và được chỉnh sửa trong Admin (FR17).

**FR02 – Chọn sản phẩm**
- Khách chọn loại áo: Áo trơn (99.000đ) hoặc Áo custom (129.000đ).
- Chọn màu áo và size từ danh sách do Admin cấu hình.
- Giá lấy từ bảng cài đặt, không hardcode.

**FR03 – Canvas thiết kế**
- Canvas hiển thị trên mockup áo. Khách chuyển giữa 3 vùng in; chỉ được vẽ trong vùng in, nét vẽ ngoài vùng bị cắt (clip).
- Công cụ: Cọ vẽ, Cục tẩy, Bảng màu, Kích thước cọ, Hình khối (chữ nhật, tròn, đường thẳng), Tô màu (Fill), Lớp (Layers: thêm, xóa, ẩn/hiện, đổi thứ tự), Hoàn tác/Làm lại (tối thiểu 30 bước), Xóa toàn bộ vùng.
- Hoạt động trên máy tính (chuột) và máy tính bảng (cảm ứng, bút). Không cuộn trang khi đang vẽ.
- Vùng in có thể để trống, nhưng áo custom phải có ít nhất 1 vùng có nội dung.
- Không có nút tải ảnh lên (BR01).

**FR04 – Xem trước (Preview)**
- Hiển thị bản vẽ áp lên mockup áo theo màu áo đã chọn, xem được cả mặt trước và mặt sau.

**FR05 – Cam kết nội dung**
- Trước khi thêm áo custom vào giỏ, khách phải tick đồng ý: nội dung tự vẽ, không bạo lực, không phản cảm, không vi phạm bản quyền. Nếu chưa tick, nút "Thêm vào giỏ" bị vô hiệu hóa.

**FR06 – Giỏ hàng**
- Một đơn chứa nhiều áo. Mỗi dòng gồm: loại áo, màu, size, số lượng, bản thiết kế (nếu là áo custom) và thành tiền.
- Mỗi áo custom là một dòng riêng gắn với một bản thiết kế. Có thể đặt nhiều cái cùng một thiết kế bằng cách tăng số lượng.
- Sửa số lượng, xóa dòng, mở lại canvas để sửa thiết kế.
- Giỏ hàng lưu tạm trên trình duyệt (localStorage) để không mất khi tải lại trang.

**FR07 – Đặt hàng và thanh toán trước**
- Khách nhập: Họ tên, Số điện thoại, Email.
- Khách chọn hình thức nhận hàng:
  - **Giao hàng:** địa chỉ nhận, thời gian mong muốn nhận hàng (văn bản), ghi chú.
  - **Nhận tại campus:** thời gian hẹn nhận, địa điểm hẹn (văn bản tự do, ví dụ "sảnh tòa Alpha").
- Khách chọn mức thanh toán trước: 50% / 75% / 100%.
- Khách tick đồng ý chính sách xử lý dữ liệu cá nhân.
- Hệ thống tạo Order Code, tính tổng tiền và số tiền cần chuyển (làm tròn lên hàng nghìn), rồi sinh mã VietQR kèm số tiền và nội dung `TUA0001`.
- Trang thanh toán hiển thị: QR, số tài khoản, tên chủ tài khoản, số tiền, nội dung chuyển khoản (có nút sao chép), thời hạn thanh toán, và nút "Tôi đã chuyển khoản".
- Gửi email xác nhận đặt hàng có kèm thông tin thanh toán.

**FR08 – Quyên góp**
- Khách nhập: tên hiển thị, email/SĐT, số tiền (tối thiểu 300.000đ), lời nhắn, lựa chọn "Hiển thị công khai trên Bảng vinh danh" hoặc "Ẩn danh".
- Hệ thống tạo Donation Code và sinh VietQR vào tài khoản quỹ (theo BR04).
- Gửi email xác nhận khi Staff xác nhận đã nhận tiền.

**FR09 – Bảng vinh danh nhà hảo tâm**
- Hiển thị các khoản quyên góp đã xác nhận: tên hiển thị (hoặc "Nhà hảo tâm ẩn danh"), số tiền, lời nhắn, ngày.
- Hiển thị tổng số tiền đã quyên góp và thanh tiến độ so với mục tiêu (Admin cấu hình).

**FR10 – Nhà tài trợ**
- Hiển thị logo nhà tài trợ, tên và liên kết tới website (mở tab mới). Có thể sắp xếp theo hạng tài trợ.

**FR11 – Tra cứu đơn hàng**
- Khách nhập Order Code và Số điện thoại, hệ thống hiển thị trạng thái hiện tại, lịch sử trạng thái, số tiền đã thanh toán và số tiền còn lại.
- Nếu đơn đang ở trạng thái Chờ thanh toán, hiển thị lại mã QR.

### 4.2. Phía Ban tổ chức

**FR12 – Đăng nhập**
- Đăng nhập bằng email và mật khẩu. Tài khoản bị vô hiệu hóa không đăng nhập được. Có chức năng đăng xuất và đổi mật khẩu.

**FR13 – Quản lý đơn hàng**
- Bảng danh sách đơn (Web và Workshop) với các cột: Order Code, nguồn đơn, tên khách, SĐT, tổng tiền, đã trả, còn lại, hình thức nhận, trạng thái, ngày tạo.
- Lọc theo trạng thái, nguồn, hình thức nhận, khoảng ngày. Tìm kiếm theo Order Code, tên, SĐT.
- Bộ đếm theo trạng thái ở đầu trang.

**FR14 – Chi tiết đơn và xác nhận thanh toán**
- Xem thông tin khách, danh sách áo, ảnh thiết kế từng vùng in (tải file in độ phân giải cao), nội dung chuyển khoản và số tiền dự kiến.
- Staff nhập số tiền thực nhận và bấm "Xác nhận thanh toán", đơn chuyển sang Đã xác nhận.
- Staff có thể từ chối: hủy đơn kèm lý do. Nếu khách đã chuyển tiền, đánh dấu cần hoàn tiền (BR06).

**FR15 – Cập nhật trạng thái**
- Chuyển trạng thái theo sơ đồ ở mục 5. Mỗi lần chuyển được ghi lịch sử (ai, lúc nào, ghi chú).
- Ghi nhận các khoản thanh toán tiếp theo (phần còn lại) khi giao hoặc nhận hàng.
- Gửi email cho khách khi đơn chuyển sang: Đã xác nhận, Sẵn sàng, Đã giao, Đã hủy.

**FR16 – Tạo đơn Workshop**
- Form nhập thông tin khách, danh sách áo, hình thức nhận, phương thức thanh toán (tiền mặt tại chỗ hoặc chuyển khoản).
- Staff upload ảnh scan bản vẽ (JPG/PNG, tối đa 10MB mỗi ảnh) cho từng áo custom.
- Nếu khách trả tiền mặt đủ mức cọc, đơn được tạo thẳng ở trạng thái Đã xác nhận.

**FR17 – Quản lý nội dung (Admin)**
- Sửa câu chuyện dự án (văn bản và ảnh), Top 5 tranh (ảnh, tên bé hoặc biệt danh, mô tả), thông tin sự kiện, khuyến mãi (tiêu đề, mô tả, ảnh, giá, thời gian hiển thị, bật/tắt).

**FR18 – Quản lý quyên góp**
- Danh sách quyên góp; Staff xác nhận đã nhận tiền hoặc hủy. Admin có thể ẩn một mục khỏi Bảng vinh danh.

**FR19 – Quản lý nhà tài trợ (Admin)**
- Thêm, sửa, xóa nhà tài trợ: tên, logo, website, hạng, thứ tự hiển thị, bật/tắt.

**FR20 – Quản lý tài khoản (Admin)**
- Tạo tài khoản Staff/Admin, đổi vai trò, vô hiệu hóa, đặt lại mật khẩu.

**FR21 – Cài đặt hệ thống (Admin)**
- Giá áo trơn và áo custom, danh sách màu và size, thời hạn tự hủy đơn (mặc định 24 giờ), thông tin 2 tài khoản ngân hàng (bán hàng và quỹ), mục tiêu quyên góp, số tiền quyên góp tối thiểu.

### 4.3. Tích hợp

**FR22 – Sinh mã VietQR**
- Sinh QR theo chuẩn VietQR (NAPAS) với ngân hàng, số tài khoản, số tiền và nội dung chuyển khoản. Nội dung không dấu, không ký tự đặc biệt, tối đa 25 ký tự.

**FR23 – Đồng bộ Google Sheets**
- Cơ sở dữ liệu là nguồn chính. Google Sheets là bản sao để theo dõi.
- Sau mỗi thay đổi (tạo đơn, đổi trạng thái, xác nhận thanh toán, quyên góp), hệ thống đồng bộ dữ liệu sang các sheet: `Orders`, `OrderItems`, `Donations`.
- Có nút "Đồng bộ lại toàn bộ" trong Admin. Nếu đồng bộ thất bại, hệ thống không chặn thao tác chính và ghi log lỗi.

**FR24 – Email thông báo**
- Gửi email khi: đặt hàng thành công, xác nhận thanh toán, đơn sẵn sàng, đã giao, đơn bị hủy hoặc hết hạn, quyên góp được xác nhận.

**FR25 – Tự động hủy đơn quá hạn**
- Định kỳ mỗi 15 phút, các đơn ở trạng thái Chờ thanh toán quá thời hạn (mặc định 24 giờ) chuyển sang Hết hạn, và hệ thống gửi email thông báo.

---

## 5. Sơ đồ trạng thái đơn hàng

| Mã | Tên hiển thị | Ý nghĩa |
|---|---|---|
| `PENDING_PAYMENT` | Chờ thanh toán | Vừa tạo, chưa báo chuyển khoản |
| `PAYMENT_REVIEW` | Chờ xác nhận thanh toán | Khách bấm "Tôi đã chuyển khoản"; Staff đối soát và duyệt nội dung bản vẽ |
| `CONFIRMED` | Đã xác nhận | Đã nhận cọc hợp lệ |
| `PRINTING` | Đang in | |
| `QC` | Kiểm tra chất lượng | |
| `READY` | Sẵn sàng giao/nhận | |
| `DELIVERED` | Đã giao | Kết thúc |
| `EXPIRED` | Hết hạn | Tự hủy do quá hạn thanh toán |
| `CANCELLED` | Đã hủy | Hủy bởi Staff (vi phạm nội dung, khách yêu cầu...) |

Chuyển trạng thái hợp lệ:
```
PENDING_PAYMENT → PAYMENT_REVIEW | EXPIRED | CANCELLED
PAYMENT_REVIEW  → CONFIRMED | PENDING_PAYMENT (chưa thấy tiền) | CANCELLED
CONFIRMED       → PRINTING | CANCELLED
PRINTING        → QC
QC              → READY | PRINTING (in lại)
READY           → DELIVERED
```
Trường `refund_status` (NONE / REQUIRED / DONE) được ghi riêng cho đơn bị hủy sau khi khách đã chuyển tiền.

Trạng thái quyên góp: `PENDING` → `CONFIRMED` | `CANCELLED`.

---

## 6. Yêu cầu phi chức năng

- **NFR01 – Hiệu năng canvas:** độ trễ nét vẽ dưới 50ms trên máy tính và tablet phổ thông (iPad 9, Galaxy Tab A).
- **NFR02 – Tương thích:** Chrome, Safari, Edge bản mới nhất; responsive cho điện thoại (xem, đặt áo trơn, quyên góp), máy tính bảng và máy tính (thiết kế).
- **NFR03 – Bảo mật:** Admin yêu cầu đăng nhập; mật khẩu được băm (do dịch vụ xác thực đảm nhiệm); phân quyền kiểm tra ở phía server; khóa bí mật không lộ ra trình duyệt; tra cứu đơn bắt buộc khớp cả Order Code và SĐT.
- **NFR04 – Tốc độ:** sinh QR dưới 2 giây; trang chủ tải dưới 3 giây trên mạng 4G.
- **NFR05 – Chất lượng in:** file xuất cho mỗi vùng in có độ phân giải 200 DPI theo kích thước thật của vùng in, định dạng PNG nền trong suốt.
- **NFR06 – Dữ liệu cá nhân:** tuân thủ Nghị định 13/2023/NĐ-CP. Có checkbox đồng ý và trang chính sách. Chỉ Staff đăng nhập mới xem được thông tin khách. Ảnh các bé chỉ dùng tên hoặc biệt danh, có sự đồng ý của mái ấm.
- **NFR07 – Tin cậy:** lỗi đồng bộ Sheets hoặc gửi email không làm thất bại việc tạo đơn.
- **NFR08 – Ngôn ngữ và định dạng:** toàn bộ giao diện tiếng Việt; tiền hiển thị dạng `129.000đ`; ngày dạng `dd/MM/yyyy HH:mm`, múi giờ Asia/Ho_Chi_Minh.
- **NFR09 – Chi phí:** vận hành trong gói miễn phí của các dịch vụ.

---

## 7. Quy tắc nghiệp vụ

- **BR01:** Không có tính năng upload ảnh từ thiết bị của khách. Chỉ Staff được upload ảnh scan cho đơn Workshop.
- **BR02:** Đơn chỉ được đưa vào sản xuất khi đã thanh toán tối thiểu 50% tổng đơn và được Staff xác nhận.
- **BR03:** Khách chọn trả trước 50%, 75% hoặc 100%. Phần còn lại thanh toán khi giao hoặc nhận hàng.
- **BR04:** Tiền bán hàng và tiền quyên góp dùng hai tài khoản ngân hàng riêng (hoặc cùng tài khoản nhưng khác tiền tố nội dung `TUA` / `UH`) để đối soát.
- **BR05:** Bản vẽ vi phạm tiêu chuẩn cộng đồng (phát hiện ở bước PAYMENT_REVIEW) dẫn đến hủy đơn.
- **BR06:** Hoàn tiền được Ban tổ chức quyết định theo từng trường hợp và ghi nhận bằng `refund_status`.
- **BR07:** Đơn ở trạng thái Chờ thanh toán quá thời hạn cấu hình (mặc định 24 giờ) tự động chuyển sang Hết hạn.
- **BR08:** Số tiền quyên góp tối thiểu là 300.000đ.
- **BR09:** Giá áo trơn 99.000đ, áo custom 129.000đ, cấu hình được trong Admin. Giá được "chốt" vào đơn tại thời điểm đặt.
- **BR10:** Phí vận chuyển (nếu giao hàng) do khách trả trực tiếp cho đơn vị vận chuyển, không tính vào tổng đơn trên website.

---

## 8. Mô hình dữ liệu (tóm tắt)

| Bảng | Trường chính |
|---|---|
| `profiles` | id (= auth user), full_name, role (ADMIN/STAFF), is_active |
| `settings` | key, value (JSON): giá, màu, size, vùng in, tài khoản ngân hàng, thời hạn hủy, mục tiêu quỹ |
| `orders` | id, code, source (WEB/WORKSHOP), customer_name, phone, email, fulfillment (DELIVERY/PICKUP), address, preferred_time, pickup_location, note, subtotal, prepay_percent, prepay_amount, paid_amount, status, refund_status, cancel_reason, expires_at, created_by, created_at |
| `order_items` | id, order_id, type (PLAIN/CUSTOM), color, size, quantity, unit_price, design_id |
| `designs` | id, source (CANVAS/SCAN), canvas_json, preview_url, created_at |
| `design_files` | id, design_id, area (vùng 1/2/3), file_url, width_px, height_px |
| `order_status_history` | id, order_id, from_status, to_status, note, changed_by, changed_at |
| `payments` | id, order_id, amount, method (TRANSFER/CASH), note, recorded_by, recorded_at |
| `donations` | id, code, display_name, contact, amount, message, is_public, is_hidden, status, confirmed_by, created_at |
| `sponsors` | id, name, logo_url, website_url, tier, sort_order, is_active |
| `content_blocks` | key (story, event, ...), title, body, image_url |
| `artworks` | id, image_url, child_name, description, sort_order |
| `promotions` | id, title, description, image_url, price_text, starts_at, ends_at, is_active |

---

## 9. Danh sách màn hình

**Public:** Trang chủ · Thiết kế áo (canvas) · Chọn áo trơn · Giỏ hàng · Thanh toán (thông tin) · Thanh toán (QR) · Tra cứu đơn · Quyên góp · Quyên góp (QR) · Bảng vinh danh · Nhà tài trợ · Chính sách dữ liệu và điều khoản.

**Admin:** Đăng nhập · Dashboard · Danh sách đơn · Chi tiết đơn · Tạo đơn Workshop · Quyên góp · Nội dung (câu chuyện, Top 5, sự kiện, khuyến mãi) · Nhà tài trợ · Tài khoản · Cài đặt.

---

## 10. Giả định và câu hỏi còn mở

| # | Nội dung | Giả định tạm thời |
|---|---|---|
| 1 | Kích thước và vị trí 3 vùng in | Ngực trái 10×10cm, mặt trước 25×30cm, mặt sau 30×40cm (chỉnh trong Cài đặt) |
| 2 | Quyền lợi khi quyên góp trên 300.000đ (câu trả lời bị cắt) | Chưa xác định |
| 3 | Bộ nhận diện (màu, font, logo) | Nhóm thiết kế sẽ cung cấp; tạm dùng bảng màu trung tính |
| 4 | Danh sách màu áo và size | Trắng, Đen, Be; S, M, L, XL, XXL |
| 5 | Ngân hàng và số tài khoản | Cấu hình trong Cài đặt |
| 6 | Khuyến mãi có giảm giá vào giỏ hàng không | Chỉ hiển thị nội dung, không tự động giảm giá |

---

## 11. Kế hoạch triển khai

| Ngày | Công việc |
|---|---|
| 30/09 | Khởi tạo dự án, cơ sở dữ liệu, xác thực, layout |
| 01/10 | Trang nội dung và Admin quản lý nội dung, nhà tài trợ |
| 02–03/10 | Canvas thiết kế và xuất file in |
| 04/10 | Giỏ hàng, đặt hàng, VietQR, email |
| 05/10 | Admin: đơn hàng, thanh toán, trạng thái, đơn Workshop |
| 06/10 | Quyên góp, Bảng vinh danh, Google Sheets, tự hủy đơn |
| 07/10 | Tra cứu đơn, kiểm thử trên tablet, deploy |
| 08/10 | Sửa lỗi, ra mắt |
