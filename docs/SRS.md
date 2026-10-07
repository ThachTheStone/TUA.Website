# TÀI LIỆU ĐẶC TẢ YÊU CẦU PHẦN MỀM (SRS)

**Dự án:** TỰA – Nét Vẽ Yêu Thương
**Phiên bản:** 2.0
**Thời gian phát triển:** 30/09/2026 – 08/10/2026
**Quy mô dự kiến:** khoảng 30 đơn hàng trong chiến dịch
**Ngôn ngữ giao diện:** Tiếng Việt

---

## 1. Giới thiệu

### 1.1. Mục đích
Tài liệu xác định đầy đủ yêu cầu chức năng, phi chức năng, quy tắc nghiệp vụ, mô hình dữ liệu và tích hợp cho website TỰA. Website gây quỹ từ thiện thông qua bán áo thun (áo custom, áo mẫu và áo trơn) và nhận quyên góp; toàn bộ lợi nhuận hỗ trợ trẻ em có hoàn cảnh đặc biệt. Tài liệu đồng thời là nguồn tham chiếu cho việc lập trình với AI (Claude Code).

### 1.2. Phạm vi
- **Trang khách hàng (Public site):** xem giới thiệu, ý nghĩa dự án, Top 5 tranh của các bé, sự kiện và khuyến mãi; mua áo mẫu; thiết kế áo trên canvas; mua Blindbox Hot Wheels; mã giảm giá và combo; tài khoản Người mua; giỏ hàng; đặt hàng và thanh toán cọc qua VietQR; quyên góp; tra cứu đơn; xem Bảng vinh danh nhà hảo tâm và nhà tài trợ.
- **Trang quản trị (Admin Portal):** quản lý mẫu áo, blindbox, mã giảm giá và combo, quản lý mẫu email, quản lý đơn hàng, xác nhận thanh toán, cập nhật trạng thái, tạo đơn Workshop thủ công, quản lý quyên góp, quản lý nội dung, quản lý nhà tài trợ, quản lý tài khoản.
- **Tích hợp:** VietQR (sinh mã QR), Google Sheets (bản sao dữ liệu để theo dõi minh bạch), Email (thông báo).

### 1.3. Ngoài phạm vi (phiên bản này)
- Xác nhận thanh toán tự động qua webhook ngân hàng (SePay/Casso) — dự kiến mở rộng sau.
- Tích hợp API đơn vị vận chuyển. Ban tổ chức tự đặt dịch vụ giao hàng bên ngoài.
- Tự động phát hiện nội dung phản cảm hoặc vi phạm bản quyền trong ảnh khách tải lên (việc duyệt do Staff/Admin làm thủ công, FR29).

### 1.4. Thuật ngữ
| Thuật ngữ | Ý nghĩa |
|---|---|
| Áo trơn | Áo không in, giá 89.000đ |
| Áo custom | Áo in bản vẽ khách tự vẽ trên canvas, giá 159.000đ |
| Blindbox Hot Wheels | Hộp xe Hot Wheels bí ẩn, giá 59.000đ, bán theo số hộp còn trong kho (FR32) |
| Mã giảm giá | Mã khách nhập khi đặt hàng để được giảm theo % hoặc số tiền (FR31) |
| Combo | Nhóm sản phẩm bán giá trọn gói, tự áp dụng khi giỏ hàng có đủ sản phẩm (FR31) |
| Áo mẫu (Prototype) | Áo in thiết kế có sẵn do Ban tổ chức đăng; mỗi mẫu có một màu áo cố định; giá bằng áo custom |
| Vùng in (Print Area) | Khu vực trên áo cho phép vẽ. Có 3 vùng |
| Cọc | Số tiền khách chuyển trước, tối thiểu 50% tổng đơn |
| Order Code | Mã đơn dạng `TUA0001`, dùng làm nội dung chuyển khoản |
| Donation Code | Mã quyên góp dạng `UH0001`; nội dung chuyển khoản là `DONATION UH0001` |
| DPI | Số điểm mực trên mỗi inch khi in; quyết định độ nét |

---

## 2. Tổng quan nghiệp vụ

TỰA là nền tảng thương mại điện tử kết hợp gây quỹ cho chiến dịch "Nét Vẽ Yêu Thương". Có ba cách mua áo: (1) **Áo custom**: tự thiết kế trên canvas của website; (2) **Áo mẫu**: chọn một thiết kế có sẵn do Ban tổ chức đăng, giá bằng áo custom; (3) **Áo trơn**: chọn màu và size. Khi thiết kế áo custom, khách có thể vẽ, viết chữ và chèn ảnh/sticker của riêng mình (câu chuyện của họ). Để kiểm soát nội dung phản cảm và vi phạm bản quyền, **mọi thiết kế áo custom phải được Staff/Admin duyệt** trước khi in (FR29).

Một đơn hàng có thể chứa cả ba loại áo. Mỗi áo custom có bản thiết kế riêng; áo mẫu dùng thiết kế và file in của mẫu. Sau khi thiết kế, khách cam kết bản quyền, điền thông tin và chọn hình thức nhận hàng. Có hai hình thức: giao hàng (khách ở ngoài trường) hoặc nhận tại campus theo lịch hẹn. Khách chọn mức thanh toán trước 50%, 75% hoặc 100%. Hệ thống sinh mã VietQR có sẵn số tiền và nội dung chuyển khoản chứa Order Code. Khách quét mã, chuyển khoản, rồi bấm "Tôi đã chuyển khoản". Song song, Staff/Admin duyệt từng thiết kế custom (Chờ duyệt → Đang xem xét → Đã duyệt hoặc Bị từ chối kèm lý do). Thiết kế bị từ chối được khách sửa và gửi lại. Staff đối soát thủ công với sao kê ngân hàng rồi bấm "Đã cọc" (khách trả 50%/75%) hoặc "Đã thanh toán 100%".

Khách vẽ tay trên giấy tại Campus Workshop được Staff scan bản vẽ và tạo đơn thủ công trên Admin. Chỉ Staff được phép upload ảnh scan.

Mỗi đơn có hai trạng thái song song: **trạng thái thanh toán** (Chưa thanh toán → Đã cọc / Đã thanh toán 100%) và **trạng thái đơn** (Chờ thanh toán → Chờ xác nhận thanh toán → Đã xác nhận → Đang in → Kiểm tra chất lượng → Sẵn sàng giao/nhận → Đã giao). Đơn chưa thanh toán quá hạn sẽ tự động hủy.

Khách dùng điện thoại được xem nội dung, mua áo trơn, blindbox, tự thiết kế áo trên canvas, quyên góp và theo dõi đơn (từ 01/10/2026 canvas dùng được cả trên điện thoại).

Toàn bộ dữ liệu đơn hàng, quyên góp và trạng thái được lưu trong cơ sở dữ liệu chính và đồng bộ sang Google Sheets để Ban tổ chức theo dõi minh bạch.

---

## 3. Tác nhân và phân quyền

| Tác nhân | Mô tả | Quyền |
|---|---|---|
| Khách (Guest) | Người truy cập, không cần đăng nhập | Xem nội dung, thiết kế, thêm vào giỏ hàng, quyên góp, tra cứu đơn |
| Người mua (Customer) | Khách đã đăng ký tài khoản (email + mật khẩu hoặc Google) | Toàn bộ quyền của Khách, cộng thêm: đặt hàng, xem lịch sử và theo dõi trạng thái đơn của mình, giỏ hàng được lưu theo tài khoản |
| Staff | Thành viên Ban tổ chức | Xử lý đơn hàng, xác nhận thanh toán, cập nhật trạng thái, tạo đơn Workshop, xác nhận quyên góp, quản lý khuyến mãi, mã giảm giá và combo |
| Admin | Trưởng nhóm / quản trị | Toàn bộ quyền của Staff, cộng thêm: quản lý tài khoản, nội dung, nhà tài trợ, cài đặt (giá, thời hạn, tài khoản ngân hàng) |

Số lượng tài khoản Staff không giới hạn. Admin có thể thêm hoặc vô hiệu hóa tài khoản bất kỳ lúc nào.

---

## 4. Yêu cầu chức năng

### 4.1. Phía Khách hàng

**FR01 – Trang chủ và thông tin dự án**
Trang chủ (màn hình S01) gồm các phần theo thứ tự:
1. **Hero:** tiêu đề chiến dịch (phần trước dấu "–" màu đỏ, phần sau màu tối, ví dụ "TỰA" / "Nét Vẽ Yêu Thương"), câu giới thiệu ngắn, hai nút bo tròn cạnh nhau "Tự thiết kế áo" (nền đỏ) và "Quyên góp" (nền be nhạt, viền đỏ, giống nút Đăng nhập), kèm liên kết tới Cửa hàng. Bên phải là hình khối đỏ (ảnh minh họa nếu có sẽ nằm trong hình khối) và 3 thẻ nổi: "100% – Lợi nhuận cho trẻ em", "Tự tay vẽ – Áo của riêng bạn", "Mục tiêu gây quỹ" (lấy từ cài đặt, ẩn nếu bằng 0).
2. **Về chúng tôi:** giới thiệu nhóm thực hiện dự án (văn bản và ảnh), ngay dưới Hero.
3. **Ý nghĩa dự án ("Câu chuyện của chúng mình"):** câu chuyện "Nét Vẽ Yêu Thương", lợi nhuận được dùng như thế nào, đối tượng được hỗ trợ. Trình bày kiểu editorial: tiêu đề serif lớn màu đỏ (Playfair Display), lưới 2 cột lệch (nhãn nhỏ bên trái, đoạn văn bên phải); đoạn đầu in lớn, dòng bắt đầu bằng "- " thành gạch đầu dòng, đoạn cuối in nghiêng nổi bật. Link "Về dự án" ở footer trỏ tới mục này (`/#cau-chuyen`).
4. **Top 5 tranh của các bé, Campus Workshop và khuyến mãi đang hoạt động** (giữ như trước).
5. **Vinh danh:** tổng tiền đã quyên góp và thanh tiến độ so với mục tiêu; khoảng 10 khoản quyên góp đã xác nhận mới nhất, mỗi khoản hiển thị tên (hoặc "Nhà hảo tâm ẩn danh"), số tiền, lời nhắn, ngày; nút "Xem tất cả" tới Bảng vinh danh (FR09).
6. **Nhà tài trợ:** logo nhà tài trợ theo hạng (FR10), đặt ngay trên footer.
- Không còn phần "Áo mẫu nổi bật" (áo mẫu chỉ bán offline, xem FR27).
- Toàn bộ nội dung lấy từ cơ sở dữ liệu và được chỉnh sửa trong Admin (FR17, FR28). Phần nào chưa có dữ liệu thì ẩn đi.

**FR33 – Cửa hàng, điều hướng và giao diện chung**
- Trang "Cửa hàng" (`/cua-hang`) hiển thị 3 sản phẩm bán online như một trang bán hàng: Áo trơn (→ `/ao-tron`, S04), Áo thiết kế (→ `/thiet-ke`, S05), Blindbox Hot Wheels (→ `/blindbox`, S06), kèm combo đang áp dụng. Blindbox ghi rõ là xe đồ chơi Hot Wheels, không phải áo.
- Header (từ màn hình rộng 1024px) có 2 tầng. Tầng 1: logo, ô tìm kiếm, rồi theo thứ tự nút "Tra cứu đơn hàng" (→ `/tra-cuu`), Giỏ hàng, nút "Đăng nhập" (chưa đăng nhập) hoặc icon Tài khoản (đã đăng nhập; chỉ có icon, không chữ, không viền, cùng cỡ và màu với icon Giỏ hàng). Header không hiện tên người mua và không có nút Đăng xuất (Đăng xuất nằm ở trang Tài khoản). Tầng 2 (menu chính, căn giữa): Trang chủ, Cửa hàng (gồm Áo trơn, Blindbox), Tự thiết kế áo, Quyên góp, Liên hệ. Màn hình nhỏ hơn: logo, nút "Tra cứu đơn hàng", Giỏ hàng và nút menu; menu gồm ô tìm kiếm, các mục trên và Đăng nhập/Tài khoản. Nút "Tra cứu đơn hàng" luôn hiện trên header ở mọi kích thước màn hình, dù đã đăng nhập hay chưa.
- Trang xem đơn bằng mã đơn + số điện thoại thống nhất tên "Tra cứu đơn hàng" (header, tiêu đề trang, breadcrumb, footer).
- Ô tìm kiếm chuyển tới Cửa hàng (`/cua-hang?q=…`) và lọc 3 sản phẩm theo tên, mô tả và từ khóa (không phân biệt dấu).
- Trang "Liên hệ" (`/lien-he`): khối đỏ có logo TỰA và các icon mạng xã hội; các thẻ liên hệ có logo đúng màu thương hiệu: từng người liên hệ qua Zalo (tên, phụ trách, số, nút Nhắn Zalo và Gọi), Facebook, email, TikTok (nếu có); liên kết Tra cứu đơn hàng. Toàn bộ lấy từ cài đặt (FR21).
- Footer (nền be nhạt): logo, liên kết Về dự án, Quyên góp, Vinh danh (→ `/vinh-danh`), Tra cứu đơn hàng, Liên hệ; biểu tượng Facebook/TikTok (ẩn nếu chưa nhập link trong cài đặt); Chính sách dữ liệu và điều khoản; "© <năm> TỰA – Nét Vẽ Yêu Thương". Không có chuyển ngôn ngữ vì web chỉ có tiếng Việt.
- Mọi trang phía khách trừ trang chủ có breadcrumb (ví dụ "Trang chủ › Cửa hàng › Áo trơn") để khách biết mình đang ở đâu.
- Trang Áo trơn có hình áo đen mặt trước/mặt sau và bảng combo ưu đãi phía dưới (giống trang Blindbox). Trang Thiết kế áo có bảng combo ưu đãi ở cột bên phải, dưới nút "Thêm vào giỏ".
- Nhận diện: logo TỰA; bảng màu #801c1c (đỏ), #fffdeb (be nhạt), #e8dbb3 (vàng be), #7aa4c2, #5f7470; giao diện dùng chủ yếu đỏ và be nhạt. Font chữ: Lexend cho toàn bộ nội dung, Tektur cho tiêu đề lớn ở Hero. Trên các trang khách: nút bo tròn hai đầu (chữ thường, không in đậm), ô nhập cao bằng nút, tiêu đề trang màu đỏ căn thẳng với breadcrumb; trang Admin và thanh công cụ canvas giữ kiểu gọn.

**FR02 – Chọn sản phẩm**
- Trên web, khách chọn Áo custom (159.000đ, tự thiết kế) hoặc Áo trơn (89.000đ). Ngoài áo, khách mua được Blindbox Hot Wheels (59.000đ, FR32). Áo mẫu (giá bằng áo custom, FR27) chỉ bán offline qua form Workshop.
- Áo custom và áo trơn: chọn màu áo và size từ danh sách do Admin cấu hình. Hiện chỉ có màu Đen; size S, M, L, XL (không còn XXL), tất cả đang bán. Cạnh chữ Size có nút **Bảng size** mở popup: hình cách đo (`public/size-diagram.webp`) và bảng số đo (dài áo / rộng / dài tay): S 69 / 50 / 21,5 cm; M 71 / 52 / 22 cm; L 73 / 54 / 22,5 cm; XL 75 / 60 / 25 cm (`src/lib/size-chart.ts`).
- Size tạm ngưng bán (`settings.sizes_disabled`) hiện thành nút bị khóa, không thêm vào giỏ được, và bị server từ chối khi đặt hàng. Admin bật/tắt trong Cài đặt → Size.
- Giá lấy từ bảng cài đặt, không hardcode.

**FR03 – Canvas thiết kế**
- Canvas hiển thị trên mockup áo. Khách chuyển giữa 3 vùng in; chỉ được vẽ trong vùng in, nét vẽ ngoài vùng bị cắt (clip).
- Công cụ: Cọ vẽ, Cục tẩy, Bảng màu, Kích thước cọ, Chữ (chọn kiểu chữ trong danh sách có sẵn, chữ đậm; kiểu chữ không hỗ trợ dấu tiếng Việt được ghi chú rõ), Hình khối (chữ nhật, tròn, đường thẳng), Tô màu (Fill), Lớp (Layers: thêm, xóa, ẩn/hiện, đổi thứ tự), Hoàn tác/Làm lại (tối thiểu 30 bước), Xóa toàn bộ vùng.
- Hoạt động trên máy tính (chuột) và máy tính bảng (cảm ứng, bút). Không cuộn trang khi đang vẽ.
- **Dùng được trên điện thoại** (từ 01/10/2026, bỏ màn hình chặn trên điện thoại): canvas co theo bề ngang màn hình, các nút công cụ tự xuống dòng, phần Lớp, xem trước, màu, size và nút Thêm vào giỏ nằm trong thanh trượt "Lớp & đặt áo". Giỏ hàng hiện nút "Sửa thiết kế" trên mọi thiết bị.
- Vùng in có thể để trống, nhưng áo custom phải có ít nhất 1 vùng có nội dung.
- **Chèn ảnh (sticker, hình ảnh):** khách đã đăng nhập được tải ảnh từ thiết bị lên canvas (BR01). Ảnh là một đối tượng trên lớp: di chuyển, phóng to/thu nhỏ, xoay, xóa như hình khối; bị cắt theo vùng in.
  - Định dạng JPG, PNG, WebP; tối đa 10MB mỗi ảnh; tối đa 10 ảnh mỗi thiết kế.
  - Ảnh được thu nhỏ trên trình duyệt về kích thước đủ in 200 DPI cho vùng in trước khi tải lên, và được lưu riêng tư (chỉ khách đó và Staff/Admin xem được).
  - Nếu ảnh quá nhỏ so với kích thước đang đặt trên áo (dưới 150 DPI khi in), hiển thị cảnh báo "Ảnh có thể bị mờ khi in".

**FR04 – Xem trước (Preview)**
- Hiển thị bản vẽ áp lên mockup áo theo màu áo đã chọn, xem được cả mặt trước và mặt sau.
- Mockup là ảnh chụp áo đen thật (mặt trước, mặt sau; `public/mockup`), dùng chung cho ảnh sản phẩm ở Cửa hàng, trang Áo trơn, giỏ hàng, xem trước khi thiết kế và ảnh xem trước gửi kèm đơn. Màu áo sáng (nếu Admin thêm) dùng hình vẽ phẳng thay thế.
- Vị trí vùng in trên áo: **Ngực trái** 10×10cm ở góc trên ngực bên trái người mặc; **Mặt trước** 28×36cm ở chính giữa, từ ngực xuống gần ngang eo; **Mặt sau** 30×40cm ở chính giữa lưng, rộng và dài hơn mặt trước một chút (migration 0014).

**FR05 – Cam kết nội dung**
- Chỉ áp dụng cho áo custom (áo mẫu do Ban tổ chức thiết kế nên không cần cam kết).
- Cam kết không nằm ở thanh bên của trang Thiết kế. Khi khách bấm "Thêm vào giỏ" (hoặc "Gửi lại thiết kế"), một popup giữa màn hình hiện nội dung cam kết: nội dung do mình vẽ hoặc mình có quyền sử dụng (kể cả ảnh tải lên), không bạo lực, không phản cảm, không vi phạm bản quyền; và hiểu rằng thiết kế sẽ được Ban tổ chức duyệt, có thể bị từ chối. Khách phải tick mới bấm được nút xác nhận trong popup; mỗi lần thêm vào giỏ đều hỏi lại.

**FR06 – Giỏ hàng**
- Một đơn chứa nhiều áo. Mỗi dòng gồm: loại áo, màu, size, số lượng, bản thiết kế (nếu là áo custom) và thành tiền.
- Mỗi áo custom là một dòng riêng gắn với một bản thiết kế. Có thể đặt nhiều cái cùng một thiết kế bằng cách tăng số lượng.
- Áo mẫu: cùng mẫu và cùng size được gộp thành một dòng. Nếu mẫu bị tắt bán, dòng đó được đánh dấu và phải xóa trước khi đặt hàng.
- Blindbox: mọi hộp gộp thành một dòng. Nếu blindbox ngừng bán hoặc số lượng vượt số hộp còn lại, dòng đó được đánh dấu và phải sửa trước khi đặt hàng.
- Combo đang áp dụng được trừ tự động và hiển thị trong phần tạm tính (FR31).
- Sửa số lượng, xóa dòng, mở lại canvas để sửa thiết kế.
- Giỏ hàng lưu tạm trên trình duyệt (localStorage) để không mất khi tải lại trang.
- Khi đã đăng nhập, giỏ hàng được lưu theo tài khoản (xem FR26).
- Trên điện thoại vẫn đặt được áo custom đã thiết kế sẵn trên thiết bị khác (giỏ hàng theo tài khoản), nhưng không có nút "Sửa thiết kế".

**FR07 – Đặt hàng và thanh toán trước**
- Phải đăng nhập tài khoản Người mua mới được đặt hàng (FR26). Họ tên, SĐT, email được điền sẵn từ tài khoản.
- Khách nhập: Họ tên, Số điện thoại, Email.
- Khách chọn hình thức nhận hàng:
  - **Giao hàng:** địa chỉ nhận, thời gian mong muốn nhận hàng (văn bản), ghi chú.
  - **Nhận tại campus:** thời gian hẹn nhận (chọn ngày trên lịch và chọn giờ; phải sau thời điểm đặt hàng), địa điểm hẹn (văn bản tự do, ví dụ "sảnh tòa Alpha").
- Khách có thể nhập một mã giảm giá (FR31). Số tiền giảm hiển thị ngay; server kiểm tra lại khi tạo đơn.
- Khách chọn mức thanh toán trước: 50% / 75% / 100% (tính trên tổng đơn sau giảm giá).
- Khách tick đồng ý chính sách xử lý dữ liệu cá nhân.
- Hệ thống tạo Order Code, tính tổng tiền và số tiền cần chuyển (làm tròn lên hàng nghìn), rồi sinh mã VietQR kèm số tiền và nội dung `TUA0001`.
- Trang thanh toán hiển thị: QR, số tài khoản, tên chủ tài khoản, số tiền, nội dung chuyển khoản (có nút sao chép), thời hạn thanh toán, và nút "Tôi đã chuyển khoản".
- Gửi email xác nhận đặt hàng có kèm thông tin thanh toán.

**FR08 – Quyên góp**
- Đầu form, khách chọn cách hiển thị trên Bảng vinh danh: **Hiển thị công khai**, **Ẩn danh** (hiện là "Nhà hảo tâm ẩn danh") hoặc **Không hiển thị** (không có trên Bảng vinh danh, vẫn cộng vào tổng). Sau đó nhập số tiền (không giới hạn tối thiểu, BR08).
- Chỉ khi chọn Hiển thị công khai mới điền được tên hiển thị, email/SĐT, lời nhắn và tick đồng ý xử lý dữ liệu cá nhân (bắt buộc). Chọn Ẩn danh hoặc Không hiển thị thì các ô này bị khóa, không lưu dữ liệu cá nhân và không gửi email cảm ơn (migration 0015 cho phép `contact` trống; Không hiển thị lưu `is_hidden = true`).
- Hệ thống tạo Donation Code và sinh VietQR vào tài khoản quỹ (theo BR04). Quét mã là app ngân hàng tự điền số tiền và nội dung `DONATION UH0001` (chữ DONATION để tách tiền quyên góp với tiền bán áo, mã UH để Staff đối soát từng khoản).- Gửi email xác nhận khi Staff xác nhận đã nhận tiền.

**FR09 – Bảng vinh danh nhà hảo tâm**
- Trang riêng `/vinh-danh` (từ 02/10/2026) chỉ có Bảng vinh danh: tổng tiền, thanh tiến độ, danh sách khoản đã xác nhận và Nhà tài trợ. Mọi link "Vinh danh" (footer, trang chủ, trang QR quyên góp) mở trang này. Trang Quyên góp vẫn có mục Vinh danh bên dưới form.
- Hiển thị các khoản quyên góp đã xác nhận: tên hiển thị (hoặc "Nhà hảo tâm ẩn danh"), số tiền, lời nhắn, ngày.
- Hiển thị tổng số tiền đã quyên góp và thanh tiến độ so với mục tiêu (Admin cấu hình).

**FR10 – Nhà tài trợ**
- Hiển thị logo nhà tài trợ, tên và liên kết tới website (mở tab mới). Có thể sắp xếp theo hạng tài trợ.

**FR11 – Tra cứu đơn hàng**
- Khách nhập Order Code và Số điện thoại, hệ thống hiển thị một nhãn trạng thái duy nhất là trạng thái hiện tại (cách tính giống "Đơn hàng của tôi", S17), lịch sử trạng thái, số tiền đã thanh toán và số tiền còn lại.
- Nếu đơn đang ở trạng thái Chờ thanh toán, hiển thị lại mã QR.

**FR27 – Áo mẫu (Prototype)**
- Cập nhật 29/09 (vấn đề bản quyền): áo mẫu **không còn bán trên web**, chỉ bán offline. Trang `/mau-ao` và `/mau-ao/[slug]` được bỏ và chuyển hướng về Cửa hàng. Staff/Admin vẫn quản lý mẫu (FR28) và bán qua form Workshop (FR16).
- Dòng áo mẫu đã có sẵn trong giỏ hàng vẫn đặt được nếu mẫu còn bật bán.
- Khách không sửa được thiết kế của áo mẫu. Muốn thay đổi thì dùng "Tự thiết kế áo".
- Giá áo mẫu bằng giá áo custom trong cài đặt (BR09) và được chốt vào đơn khi đặt.

**FR32 – Blindbox Hot Wheels**
- Trang `/blindbox`: ảnh, tên, mô tả, giá, số hộp còn lại, chọn số lượng, nút "Thêm vào giỏ", và các combo có blindbox.
- Blindbox không có màu hay size. Không đặt được quá số hộp còn lại; khi hết hàng hoặc tắt bán thì không thêm được vào giỏ.
- Số hộp còn lại = tổng số hộp Staff/Admin nhập − số hộp trong các đơn chưa Hủy/Hết hạn. Đơn bị hủy hoặc hết hạn tự trả hộp lại kho.
- Staff/Admin sửa tên, mô tả, ảnh, tổng số hộp và bật/tắt bán ở trang Admin "Blindbox". Giá nằm trong Cài đặt (Admin).

### 4.2. Phía Ban tổ chức

**FR12 – Đăng nhập**
- Đăng nhập bằng email và mật khẩu. Tài khoản bị vô hiệu hóa không đăng nhập được. Có chức năng đăng xuất và đổi mật khẩu.

**FR13 – Quản lý đơn hàng**
- Bảng danh sách đơn (Web và Workshop) với các cột: Order Code, nguồn đơn, tên khách, SĐT, tổng tiền, đã trả, còn lại, hình thức nhận, trạng thái đơn, trạng thái thanh toán, ngày tạo.
- Lọc theo trạng thái đơn, trạng thái thanh toán, trạng thái duyệt thiết kế (có đơn cần duyệt), nguồn, hình thức nhận, khoảng ngày. Tìm kiếm theo Order Code, tên, SĐT.
- Bộ đếm theo trạng thái ở đầu trang.

**FR14 – Chi tiết đơn và xác nhận thanh toán**
- Xem thông tin khách, danh sách áo (áo mẫu hiển thị tên mẫu), ảnh thiết kế từng vùng in (tải file in độ phân giải cao; với áo mẫu là file in của mẫu), nội dung chuyển khoản và số tiền dự kiến.
- Staff/Admin đối soát sao kê rồi bấm một trong hai nút:
  - **"Đã cọc"**: dùng khi khách trả trước 50% hoặc 75%. Staff nhập số tiền thực nhận (mặc định bằng số tiền cọc của đơn); số tiền phải từ 50% tổng đơn trở lên (BR02) và nhỏ hơn tổng đơn. Trạng thái thanh toán thành Đã cọc.
  - **"Đã thanh toán 100%"**: dùng khi khách đã trả đủ. Hệ thống ghi nhận khoản còn thiếu để số đã trả bằng tổng đơn. Trạng thái thanh toán thành Đã thanh toán 100%.
- Lần xác nhận đầu tiên chuyển trạng thái đơn từ Chờ xác nhận thanh toán sang Đã xác nhận.
- Mỗi lần bấm ghi một khoản vào `payments` (số tiền, phương thức, người bấm, thời gian) và một dòng lịch sử.
- Duyệt từng thiết kế custom ngay trong trang chi tiết đơn (FR29).
- Staff có thể hủy đơn kèm lý do. Nếu khách đã chuyển tiền, đánh dấu cần hoàn tiền (BR06).
- Mọi ô nhập số tiền (Admin và form quyên góp) nhận số lẻ đến từng đồng, không bắt buộc bội số 1.000đ (từ 07/10/2026).
- **"Sửa số tiền đã nhận"** (chỉ Admin): dùng khi đã ghi nhận sai hoặc khách chuyển thêm. Admin nhập lại tổng số tiền thực tế đã nhận (0đ đến tổng đơn) và lý do bắt buộc. Trạng thái thanh toán tính lại theo số mới: 0đ → Chưa thanh toán, bằng tổng đơn → Đã thanh toán 100%, còn lại → Đã cọc. Chỉ dùng khi đơn ở Đã xác nhận, Đang in, Kiểm tra chất lượng, Sẵn sàng giao/nhận hoặc Đã giao. Không tạo khoản mới trong `payments`; lịch sử ghi "số cũ → số mới", người sửa, lý do.
- **"Sửa thông tin đơn"** (Staff và Admin): sửa họ tên, SĐT, email, hình thức nhận hàng, địa chỉ hoặc địa điểm hẹn, thời gian, ghi chú khi đơn chưa Hết hạn/Đã hủy. Không sửa sản phẩm và số tiền. Lịch sử ghi các trường đã đổi (họ tên, SĐT, email, nhận hàng kèm giá trị cũ → mới). Khách tra cứu đơn bằng SĐT mới sau khi đổi.
- Các dòng chỉnh sửa chỉ hiện trong lịch sử Admin; khách chỉ thấy các lần đổi trạng thái đơn.

**FR15 – Cập nhật trạng thái**
- Chuyển trạng thái theo sơ đồ ở mục 5. Mỗi lần chuyển được ghi lịch sử (ai, lúc nào, ghi chú).
- Đơn Đã cọc: khi khách trả phần còn lại (lúc nhận áo hoặc chuyển khoản sau), Staff/Admin bấm "Đã thanh toán 100%" ở bất kỳ trạng thái đơn nào trước khi đơn bị hủy.
- Nút **"Đã giao"** (Staff/Admin) chỉ hiện khi đơn ở trạng thái Sẵn sàng giao/nhận. Đơn Đã cọc vẫn được bấm Đã giao; khi đó màn hình cảnh báo số tiền còn lại và đơn tiếp tục hiển thị "Còn nợ" trong danh sách cho đến khi bấm "Đã thanh toán 100%".
- Gửi email cho khách khi: xác nhận Đã cọc, xác nhận Đã thanh toán 100%, đơn Sẵn sàng, Đã giao, Đã hủy.

**FR16 – Tạo đơn Workshop**
- Form nhập thông tin khách, danh sách áo, hình thức nhận, phương thức thanh toán (tiền mặt tại chỗ hoặc chuyển khoản).
- Staff upload ảnh scan bản vẽ (JPG/PNG, tối đa 10MB mỗi ảnh) cho từng áo custom; thiết kế Workshop được tạo ở trạng thái Đã duyệt (Staff đã xem tại chỗ). Có thể chọn áo mẫu (không cần scan).
- Nếu khách trả tiền mặt tại chỗ, đơn được tạo thẳng ở trạng thái Đã xác nhận, với trạng thái thanh toán Đã cọc (trả từ 50% đến dưới 100%) hoặc Đã thanh toán 100%.

**FR17 – Quản lý nội dung (Admin)**
- Sửa nội dung Hero (tiêu đề, câu giới thiệu, ảnh nền), Về chúng tôi, Ý nghĩa dự án, câu chuyện dự án (văn bản và ảnh), Top 5 tranh (ảnh, tên bé hoặc biệt danh, mô tả), thông tin sự kiện, khuyến mãi (tiêu đề, mô tả, ảnh, giá, thời gian hiển thị, bật/tắt). Khuyến mãi có mục riêng "Khuyến mãi" (`/admin/khuyen-mai`) trên menu Admin, cạnh "Giảm giá"; Staff cũng thêm/sửa/xóa được khuyến mãi (các nội dung khác vẫn chỉ Admin).

**FR18 – Quản lý quyên góp**
- Danh sách quyên góp; Staff xác nhận đã nhận tiền hoặc hủy. Admin có thể ẩn một mục khỏi Bảng vinh danh.

**FR19 – Quản lý nhà tài trợ (Admin)**
- Thêm, sửa, xóa nhà tài trợ: tên, logo, website, hạng, thứ tự hiển thị, bật/tắt.

**FR20 – Quản lý tài khoản (Admin)**
- Tạo tài khoản Staff/Admin, đổi vai trò, vô hiệu hóa, đặt lại mật khẩu.

**FR21 – Cài đặt hệ thống (Admin)**
- Giá áo trơn và áo custom, danh sách màu và size, thời hạn tự hủy đơn (mặc định 24 giờ), thông tin 2 tài khoản ngân hàng (bán hàng và quỹ), mục tiêu quyên góp, số tiền quyên góp tối thiểu, thông tin liên hệ Ban tổ chức (số điện thoại/Zalo chính, danh sách người liên hệ Zalo gồm họ tên, phụ trách, số điện thoại; Facebook, TikTok, email) hiển thị ở trang Liên hệ, footer và cho khách cần hỗ trợ thiết kế.

**FR28 – Quản lý mẫu áo (Staff/Admin)**
- Thêm, sửa, bật/tắt bán, sắp xếp thứ tự mẫu áo. Mẫu đã có trong đơn hàng không xóa được, chỉ tắt bán.
- Mỗi mẫu gồm: tên, đường dẫn (slug), mô tả, màu áo (một màu trong cài đặt), 1–4 ảnh hiển thị (JPG/PNG/WebP, tối đa 5MB mỗi ảnh), và file in PNG cho từng vùng in được dùng (ít nhất 1 vùng, tối đa 20MB mỗi file).
- Hệ thống kiểm tra file in đủ độ phân giải theo kích thước vùng in và DPI trong cài đặt; nếu thiếu thì cảnh báo.

**FR29 – Duyệt thiết kế áo custom**
- Mỗi áo custom trong đơn có trạng thái duyệt riêng (§5.3). Áo mẫu và áo trơn không cần duyệt.
- Khi đơn được tạo, mọi áo custom ở trạng thái **Chờ duyệt**. Việc duyệt diễn ra song song với thanh toán (khách vẫn thanh toán ngay).
- Staff/Admin mở thiết kế (ảnh xem trước trên áo và file in từng vùng, xem được cả ảnh gốc khách tải lên) và bấm:
  - **"Xem xét"**: chuyển sang **Đang xem xét** (để người khác biết đã có người nhận xử lý).
  - **"Duyệt"**: chuyển sang **Đã duyệt**. Thiết kế đã duyệt bị khóa, khách không sửa được nữa.
  - **"Từ chối"**: bắt buộc nhập lý do; chuyển sang **Bị từ chối**. Khách thấy lý do trong tài khoản và nhận email. Ban tổ chức liên hệ khách ngoài hệ thống (điện thoại/Zalo) để trao đổi.
- Thiết kế Bị từ chối: khách mở lại áo đó từ trang Tài khoản trên máy tính/máy tính bảng, sửa và bấm "Gửi lại". Thiết kế mới thay thế thiết kế cũ, quay về **Chờ duyệt**. Chỉ đổi được thiết kế; loại áo, màu, size, số lượng và giá giữ nguyên.
- Nếu không thống nhất được với khách, Staff hủy đơn kèm lý do (hoàn tiền theo BR06).
- Mỗi lần đổi trạng thái duyệt được ghi lịch sử (ai, lúc nào, lý do). Danh sách đơn trong Admin có bộ đếm "Thiết kế chờ duyệt".

**FR30 – Quản lý mẫu email (Admin)**
- Trang "Mẫu email" trong Admin liệt kê mọi email hệ thống gửi (FR24): tên, mô tả khi nào gửi, trạng thái bật/tắt, lần sửa cuối (ai, lúc nào).

| Mã | Email | Gửi khi |
|---|---|---|
| `ORDER_CREATED` | Đặt hàng thành công | Khách đặt đơn trên website |
| `DEPOSIT_CONFIRMED` | Đã nhận cọc | Staff bấm "Đã cọc" |
| `FULLY_PAID` | Đã thanh toán 100% | Staff bấm "Đã thanh toán 100%" |
| `DESIGN_REJECTED` | Thiết kế bị từ chối | Staff bấm "Từ chối" một thiết kế |
| `ORDER_READY` | Đơn sẵn sàng | Đơn chuyển sang Sẵn sàng giao/nhận |
| `ORDER_DELIVERED` | Đã giao | Staff bấm "Đã giao" |
| `ORDER_CANCELLED` | Đơn bị hủy | Staff hủy đơn |
| `ORDER_EXPIRED` | Đơn hết hạn | Hệ thống tự hủy đơn quá hạn |
| `DONATION_CONFIRMED` | Cảm ơn quyên góp | Staff xác nhận khoản quyên góp |

- Với mỗi mẫu, Admin sửa: **tiêu đề** và **nội dung** (văn bản có xuống dòng, in đậm, liên kết), và bật/tắt việc gửi.
- Nội dung dùng **biến** đặt trong ngoặc nhọn, được thay bằng dữ liệu thật khi gửi. Mỗi mẫu hiển thị danh sách biến dùng được và bấm để chèn, ví dụ: `{ten_khach}`, `{ma_don}`, `{tong_tien}`, `{da_tra}`, `{con_lai}`, `{so_tien_can_chuyen}`, `{han_thanh_toan}`, `{hinh_thuc_nhan}`, `{link_don_hang}`, `{ly_do}`, `{ten_nguoi_quyen_gop}`, `{so_tien_quyen_gop}`, `{ma_quyen_gop}`, `{lien_he_ban_to_chuc}`. Tiền hiển thị dạng `129.000đ`, ngày dạng `dd/MM/yyyy HH:mm`.
- Khi lưu, hệ thống báo lỗi nếu có biến không tồn tại cho mẫu đó, hoặc thiếu biến bắt buộc (ví dụ `{ma_don}` trong email đơn hàng, `{ly_do}` trong email từ chối/hủy).
- Phần cố định do hệ thống tự thêm, Admin không sửa được: đầu/cuối email (tên dự án, liên hệ), và các khối thông tin bắt buộc: mã QR + thông tin chuyển khoản trong email Đặt hàng thành công, bảng sản phẩm và số tiền trong các email đơn hàng.
- **Xem trước** email với dữ liệu mẫu; **Gửi thử** tới email của Admin đang đăng nhập; **Khôi phục mặc định** về nội dung ban đầu.
- Chỉ Admin truy cập trang này. Email xác thực tài khoản khi đăng ký (FR26) do dịch vụ xác thực gửi và được sửa trong bảng điều khiển Supabase, không nằm trong trang này.

**FR31 – Mã giảm giá và combo (Staff/Admin)**
- **Mã giảm giá:** Staff/Admin tạo, sửa, bật/tắt, xóa mã (từ 30/09/2026 Staff cũng được quản lý Giảm giá và Khuyến mãi). Mỗi mã có: mã (chữ không dấu, số, `-`, `_`), kiểu giảm (theo % hoặc số tiền cố định), mức giảm, giảm tối đa (chỉ cho kiểu %), đơn tối thiểu (tính trên tiền hàng trước giảm), tổng số lượt dùng (để trống = không giới hạn), thời gian áp dụng từ/đến.
- Lượt dùng tính theo số đơn chưa Hủy/Hết hạn có dùng mã; đơn bị hủy hoặc hết hạn được trả lượt. Mã đã có trong đơn không xóa được, chỉ tắt.
- **Combo:** Staff/Admin tạo, sửa, bật/tắt, xóa combo gồm tên, mô tả, các sản phẩm và số lượng (Áo custom, Áo mẫu, Áo trơn, Blindbox), giá combo, thời gian áp dụng, thứ tự. Combo chỉ được áp dụng khi giá combo thấp hơn tổng giá lẻ.
- Combo tự áp dụng: combo giảm nhiều nhất được lấy trước, nhiều lần nếu giỏ đủ sản phẩm, rồi tới combo tiếp theo.
- Mỗi đơn dùng tối đa một mã. Mã và combo **không cộng dồn**: hệ thống áp dụng ưu đãi có lợi hơn cho khách và báo cho khách biết.
- Đơn lưu tiền hàng, số tiền giảm, ưu đãi đã áp dụng và mã (nếu có). Sửa hoặc xóa mã/combo không làm thay đổi đơn đã đặt.
- Đơn Workshop cũng áp dụng combo và nhận mã giảm giá.
- Tổng đơn sau giảm tối thiểu 1.000đ.

### 4.3. Tích hợp

**FR22 – Sinh mã VietQR**
- Sinh QR theo chuẩn VietQR (NAPAS) với ngân hàng, số tài khoản, số tiền và nội dung chuyển khoản. Nội dung không dấu, không ký tự đặc biệt, tối đa 25 ký tự.

**FR23 – Đồng bộ Google Sheets**
- Cơ sở dữ liệu là nguồn chính. Google Sheets là bản sao để theo dõi.
- Sau mỗi thay đổi (tạo đơn, đổi trạng thái, xác nhận thanh toán, quyên góp), hệ thống đồng bộ dữ liệu sang các sheet: `Orders`, `OrderItems`, `Donations`.
- Có nút "Đồng bộ lại toàn bộ" trong Admin. Nếu đồng bộ thất bại, hệ thống không chặn thao tác chính và ghi log lỗi.

**FR24 – Email thông báo**
- Gửi email khi: đặt hàng thành công, xác nhận Đã cọc, xác nhận Đã thanh toán 100%, thiết kế bị từ chối (kèm lý do), đơn sẵn sàng, đã giao, đơn bị hủy, đơn hết hạn, quyên góp được xác nhận.
- Tiêu đề và nội dung từng email lấy từ mẫu email do Admin quản lý (FR30). Email bị tắt thì không gửi.

**FR25 – Tự động hủy đơn quá hạn**
- Định kỳ mỗi 15 phút, các đơn ở trạng thái Chờ thanh toán quá thời hạn (mặc định 24 giờ) chuyển sang Hết hạn, và hệ thống gửi email thông báo.

### 4.4. Tài khoản Người mua

**FR26 – Đăng ký, đăng nhập, đăng xuất cho Người mua**
- Đăng ký bằng email + mật khẩu (tối thiểu 8 ký tự) kèm Họ tên và Số điện thoại. Tài khoản chỉ dùng được sau khi bấm liên kết xác thực gửi qua email. **Tạm thời** (từ 30/09/2026, do chưa gửi được email qua SMTP Gmail) bước xác thực email đang tắt trong Supabase (Authentication → Email → Confirm email): đăng ký xong là vào thẳng tài khoản; bật lại khi email hoạt động, code tự quay về luồng gửi link.
- **Tạm thời** (từ 30/09/2026, email chưa gửi được): trang "Quên mật khẩu" không gửi liên kết mà thông báo hệ thống gửi email đang trục trặc, mời khách gọi hoặc nhắn Zalo số liên hệ chính trong Cài đặt (hiện là 0383 591 607) để được hỗ trợ đặt hàng. Khi email hoạt động lại, đưa form gửi liên kết (ForgotPasswordForm) trở lại trang này.
- Đăng nhập bằng email + mật khẩu hoặc bằng Google. Người dùng Google không bắt buộc nhập SĐT khi đăng ký; SĐT được hỏi ở bước đặt hàng và lưu lại vào tài khoản.
- Có chức năng đăng xuất. Khi đăng xuất, giỏ hàng trên trình duyệt được xóa (vẫn còn lưu trong tài khoản).
- Trang "Tài khoản": xem và sửa Họ tên, SĐT; danh sách "Đơn hàng của tôi" (mã đơn, ngày, **một** trạng thái duy nhất, tổng tiền, đã trả). Trạng thái hiển thị chọn theo thứ tự ưu tiên: Đã hủy/Hết hạn → Quá hạn thanh toán → Cần sửa thiết kế → Chờ thanh toán → Đã giao, còn nợ → trạng thái đơn (S17). Trạng thái thanh toán chi tiết xem trong trang chi tiết đơn; xem chi tiết và lịch sử trạng thái từng đơn, trạng thái duyệt của từng áo custom và lý do nếu bị từ chối; sửa và gửi lại thiết kế bị từ chối (FR29); thanh toán lại đơn đang Chờ thanh toán.
- Giỏ hàng được lưu theo tài khoản: đăng nhập trên thiết bị khác sẽ thấy lại giỏ hàng. Giỏ hàng tạo khi chưa đăng nhập được gộp vào giỏ của tài khoản khi đăng nhập.
- Tài khoản Người mua tách biệt với tài khoản Staff/Admin và không truy cập được trang quản trị.

---

## 5. Sơ đồ trạng thái đơn hàng

Mỗi đơn có hai trạng thái độc lập: **trạng thái đơn** (`status`, tiến độ xử lý) và **trạng thái thanh toán** (`payment_status`, tiền đã nhận).

### 5.1. Trạng thái đơn

| Mã | Tên hiển thị | Ý nghĩa |
|---|---|---|
| `PENDING_PAYMENT` | Chờ thanh toán | Vừa tạo, chưa báo chuyển khoản |
| `PAYMENT_REVIEW` | Chờ xác nhận thanh toán | Khách bấm "Tôi đã chuyển khoản"; Staff đối soát sao kê |
| `CONFIRMED` | Đã xác nhận | Staff đã xác nhận Đã cọc hoặc Đã thanh toán 100% |
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
PAYMENT_REVIEW → CONFIRMED chỉ xảy ra qua nút "Đã cọc" hoặc "Đã thanh toán 100%". CONFIRMED → PRINTING chỉ khi mọi áo custom Đã duyệt (BR12). READY → DELIVERED chỉ xảy ra qua nút "Đã giao".

### 5.2. Trạng thái thanh toán

| Mã | Tên hiển thị | Ý nghĩa |
|---|---|---|
| `UNPAID` | Chưa thanh toán | Chưa có khoản nào được xác nhận |
| `DEPOSIT_PAID` | Đã cọc | Staff/Admin bấm "Đã cọc": đã nhận từ 50% đến dưới 100% tổng đơn |
| `FULLY_PAID` | Đã thanh toán 100% | Staff/Admin bấm "Đã thanh toán 100%": đã nhận đủ tổng đơn |

```
UNPAID       → DEPOSIT_PAID | FULLY_PAID
DEPOSIT_PAID → FULLY_PAID
```
- Chỉ Staff/Admin đổi được trạng thái thanh toán, bằng các nút trên. Ngoài sơ đồ trên, Admin có thể "Sửa số tiền đã nhận" (FR14); khi đó trạng thái thanh toán được tính lại theo tổng tiền mới, kể cả lùi về Đã cọc hoặc Chưa thanh toán. Khách bấm "Tôi đã chuyển khoản" chỉ chuyển trạng thái đơn sang Chờ xác nhận thanh toán.
- Đơn Đã giao nhưng thanh toán vẫn là Đã cọc được hiển thị là "Còn nợ" trong Admin.

### 5.3. Trạng thái duyệt thiết kế (từng áo custom)

| Mã | Tên hiển thị | Ý nghĩa |
|---|---|---|
| `PENDING_APPROVAL` | Chờ duyệt | Mặc định khi tạo đơn hoặc khi khách gửi lại |
| `UNDER_REVIEW` | Đang xem xét | Staff/Admin đã nhận xem xét |
| `APPROVED` | Đã duyệt | Được phép in; thiết kế bị khóa |
| `REJECTED` | Bị từ chối | Có lý do; Ban tổ chức liên hệ khách |

```
PENDING_APPROVAL → UNDER_REVIEW | APPROVED | REJECTED
UNDER_REVIEW     → APPROVED | REJECTED | PENDING_APPROVAL (trả lại hàng chờ)
REJECTED         → PENDING_APPROVAL (khách gửi lại thiết kế)
```

Trường `refund_status` (NONE / REQUIRED / DONE) được ghi riêng cho đơn bị hủy sau khi khách đã chuyển tiền.

Trạng thái quyên góp: `PENDING` → `CONFIRMED` | `CANCELLED`.

---

## 6. Yêu cầu phi chức năng

- **NFR01 – Hiệu năng canvas:** độ trễ nét vẽ dưới 50ms trên máy tính và tablet phổ thông (iPad 9, Galaxy Tab A).
- **NFR02 – Tương thích:** Chrome, Safari, Edge bản mới nhất. Máy tính, máy tính bảng và điện thoại đều dùng được mọi chức năng phía khách, kể cả tự thiết kế áo trên canvas (từ 01/10/2026).
- **NFR03 – Bảo mật:** Admin yêu cầu đăng nhập; mật khẩu được băm (do dịch vụ xác thực đảm nhiệm); phân quyền kiểm tra ở phía server; khóa bí mật không lộ ra trình duyệt; tra cứu đơn bắt buộc khớp cả Order Code và SĐT.
- **NFR04 – Tốc độ:** sinh QR dưới 2 giây; trang chủ tải dưới 3 giây trên mạng 4G.
- **NFR05 – Chất lượng in:** file xuất cho mỗi vùng in có độ phân giải 200 DPI theo kích thước thật của vùng in, định dạng PNG nền trong suốt.
- **NFR06 – Dữ liệu cá nhân:** tuân thủ Nghị định 13/2023/NĐ-CP. Có checkbox đồng ý và trang chính sách. Chỉ Staff đăng nhập mới xem được thông tin khách. Ảnh các bé chỉ dùng tên hoặc biệt danh, có sự đồng ý của mái ấm. Ảnh khách tải lên chỉ dùng để in đơn của họ; ảnh của đơn Hết hạn/Đã hủy và ảnh không nằm trong đơn nào được xóa sau 30 ngày.
- **NFR07 – Tin cậy:** lỗi đồng bộ Sheets hoặc gửi email không làm thất bại việc tạo đơn.
- **NFR08 – Ngôn ngữ và định dạng:** toàn bộ giao diện tiếng Việt; tiền hiển thị dạng `129.000đ`; ngày dạng `dd/MM/yyyy HH:mm`, múi giờ Asia/Ho_Chi_Minh.
- **NFR09 – Chi phí:** vận hành trong gói miễn phí của các dịch vụ.

---

## 7. Quy tắc nghiệp vụ

- **BR01:** Khách chỉ được tải ảnh lên ở một nơi: công cụ Chèn ảnh trong canvas thiết kế (FR03), và phải đăng nhập. Ảnh khách tải lên được kiểm tra định dạng và dung lượng ở server, lưu riêng tư, không bao giờ hiển thị công khai. Staff/Admin được tải ảnh trong trang quản trị: ảnh scan cho đơn Workshop, ảnh và file in của áo mẫu, ảnh nội dung và logo nhà tài trợ.
- **BR02:** Đơn chỉ được đưa vào sản xuất khi trạng thái thanh toán là Đã cọc (tối thiểu 50% tổng đơn) hoặc Đã thanh toán 100%, do Staff/Admin xác nhận.
- **BR12:** Đơn chỉ được chuyển sang Đang in khi mọi áo custom trong đơn ở trạng thái Đã duyệt.
- **BR11:** Đơn Đã cọc được phép giao; phần còn lại thu khi giao/nhận và ghi nhận bằng nút "Đã thanh toán 100%".
- **BR03:** Khách chọn trả trước 50%, 75% hoặc 100%. Phần còn lại thanh toán khi giao hoặc nhận hàng.
- **BR04:** Tiền bán hàng và tiền quyên góp dùng hai tài khoản ngân hàng riêng (hoặc cùng tài khoản nhưng khác tiền tố nội dung `TUA` / `DONATION`) để đối soát.
- **BR05:** Thiết kế có nội dung phản cảm, bạo lực hoặc vi phạm bản quyền (kể cả ảnh tải lên) bị từ chối kèm lý do (FR29). Khách sửa và gửi lại, hoặc Staff hủy đơn.
- **BR06:** Hoàn tiền được Ban tổ chức quyết định theo từng trường hợp và ghi nhận bằng `refund_status`.
- **BR07:** Đơn ở trạng thái Chờ thanh toán quá thời hạn cấu hình (mặc định 24 giờ) tự động chuyển sang Hết hạn.
- **BR08:** Không giới hạn số tiền quyên góp tối thiểu (từ 01/10/2026); cài đặt `donation_min` để 1.000đ chỉ để chặn số tiền 0. Mục tiêu quyên góp hiện là 5.000.000đ (cài đặt `donation_goal`).
- **BR09:** Giá áo trơn 89.000đ, áo custom 159.000đ, Blindbox Hot Wheels 59.000đ (từ 30/09/2026), cấu hình được trong Admin. Áo mẫu dùng giá áo custom. Giá và số tiền giảm được "chốt" vào đơn tại thời điểm đặt.
- **BR13:** Mỗi đơn nhận một ưu đãi: hoặc một mã giảm giá, hoặc các combo, tùy cái nào có lợi hơn cho khách (FR31).
- **BR10:** Phí vận chuyển (nếu giao hàng) do khách trả trực tiếp cho đơn vị vận chuyển, không tính vào tổng đơn trên website.

---

## 8. Mô hình dữ liệu (tóm tắt)

| Bảng | Trường chính |
|---|---|
| `profiles` | id (= auth user), full_name, role (ADMIN/STAFF), is_active |
| `customers` | id (= auth user), full_name, phone, created_at |
| `carts` | customer_id, items (JSON), drafts (JSON), updated_at |
| `email_templates` | key (ORDER_CREATED, ...), subject, body, is_enabled, updated_by, updated_at |
| `settings` | key, value (JSON): giá (áo trơn, áo custom, blindbox), màu, size, size tạm ngưng bán (`sizes_disabled`), blindbox (tên, mô tả, ảnh, tổng số hộp, bật/tắt), vùng in, tài khoản ngân hàng, thời hạn hủy, mục tiêu quỹ, liên hệ Ban tổ chức |
| `orders` | id, code, source (WEB/WORKSHOP), customer_name, phone, email, fulfillment (DELIVERY/PICKUP), address, preferred_time, pickup_location, note, items_total, discount_amount, discount_note, promo_code_id, subtotal (sau giảm), prepay_percent, prepay_amount, paid_amount, status, payment_status (UNPAID/DEPOSIT_PAID/FULLY_PAID), refund_status, cancel_reason, expires_at, created_by, customer_id, created_at |
| `order_items` | id, order_id, type (PLAIN/CUSTOM/PROTOTYPE/BLINDBOX), color, size, quantity, unit_price, design_id, prototype_id, approval_status, reject_reason, reviewed_by, reviewed_at |
| `design_reviews` | id, order_item_id, from_status, to_status, reason, changed_by (null = khách gửi lại), design_id, changed_at |
| `design_assets` | id, customer_id, file_path, width_px, height_px, bytes, created_at (ảnh khách tải lên, bucket riêng tư) |
| `prototypes` | id, slug, name, description, color, image_urls, design_id (file in), sort_order, stock_limit (giới hạn số lượng, null = không giới hạn), is_active, created_at |
| `shirt_stock` | color, size, quantity (tổng số áo trơn Ban tổ chức có; không có dòng = không giới hạn), updated_at. Còn lại = quantity − số áo cùng màu/size trong các đơn chưa Hủy/Hết hạn |
| `designs` | id, source (CANVAS/SCAN/PROTOTYPE), canvas_json, preview_url, created_at |
| `design_files` | id, design_id, area (vùng 1/2/3), file_url, width_px, height_px |
| `order_status_history` | id, order_id, from_status, to_status, note, changed_by, changed_at |
| `payments` | id, order_id, amount, method (TRANSFER/CASH), note, recorded_by, recorded_at |
| `donations` | id, code, display_name, contact, amount, message, is_public, is_hidden, status, confirmed_by, created_at |
| `sponsors` | id, name, logo_url, website_url, tier, sort_order, is_active |
| `content_blocks` | key (hero, about, mission, story, event, ...), title, body, image_url |
| `artworks` | id, image_url, child_name, description, sort_order |
| `promotions` | id, title, description, image_url, price_text, starts_at, ends_at, is_active (chỉ hiển thị) |
| `promo_codes` | id, code, description, kind (PERCENT/AMOUNT), value, max_discount, min_subtotal, max_uses, starts_at, ends_at, is_active |
| `combos` | id, name, description, price, items (JSON: loại + số lượng), starts_at, ends_at, is_active, sort_order |

---

## 9. Danh sách màn hình

**Public:** Trang chủ · Cửa hàng · Blindbox · Đăng nhập · Đăng ký · Tài khoản (lịch sử đơn) · Thiết kế áo (canvas) · Chọn áo trơn · Giỏ hàng · Thanh toán (thông tin) · Thanh toán (QR) · Tra cứu đơn hàng · Quyên góp (gồm Vinh danh và Nhà tài trợ) · Quyên góp (QR) · Liên hệ · Chính sách dữ liệu và điều khoản.

**Admin:** Đăng nhập · Dashboard · Mẫu áo · Blindbox · Khuyến mãi · Giảm giá (mã giảm giá, combo) · Danh sách đơn · Chi tiết đơn · Tạo đơn Workshop · Quyên góp · Nội dung (câu chuyện, Top 5, sự kiện) · Nhà tài trợ · Mẫu email · Tài khoản · Cài đặt.

---

## 10. Giả định và câu hỏi còn mở

| # | Nội dung | Giả định tạm thời |
|---|---|---|
| 1 | Kích thước và vị trí 3 vùng in | Ngực trái 10×10cm, mặt trước 28×36cm, mặt sau 30×40cm; vị trí theo FR04 (chỉnh trong Cài đặt) |
| 2 | Quyền lợi khi quyên góp trên 300.000đ (câu trả lời bị cắt) | Chưa xác định |
| 3 | Bộ nhận diện (màu, font, logo) | Đã có (29/09): logo TỰA, 5 màu moodboard (FR33), font Be Vietnam Pro |
| 4 | Danh sách màu áo và size | Chỉ màu Đen (đã bỏ Trắng và Be; đơn cũ vẫn giữ màu đã đặt); S, M, L, XL (đã bỏ XXL), XL mở bán từ 01/10/2026; `sizes_disabled` để trống |
| 5 | Ngân hàng và số tài khoản | Cấu hình trong Cài đặt |
| 6 | Khuyến mãi có giảm giá vào giỏ hàng không | Khuyến mãi (FR17) vẫn chỉ là nội dung hiển thị; giảm giá thật dùng mã giảm giá và combo (FR31) |
| 7 | Áo mẫu có giới hạn số lượng (tồn kho) không | Có (cập nhật 27/09): kho áo trơn theo màu × size (trang Kho áo, Staff/Admin) và giới hạn tùy chọn cho từng mẫu áo. Áo trong đơn chưa Hủy/Hết hạn tính là đã lấy (trừ ngay khi đặt); đơn Hủy/Hết hạn tự trả lại kho; hết hàng thì không đặt được. Để trống = không giới hạn. Migration 0012 |
| 8 | Áo mẫu có giá riêng không | Không; luôn bằng giá áo custom trong Cài đặt |
| 9 | Nội dung "Về chúng tôi" và "Ý nghĩa dự án" | Nhóm dự án cung cấp; Admin nhập trong Nội dung |
| 10 | Top 5 tranh, Workshop, khuyến mãi trên trang chủ mới | Giữ lại, đặt sau phần Ý nghĩa dự án |
| 11 | Cách nhận biết điện thoại | Cạnh ngắn màn hình dưới 600px (iPad mini trở lên được xem là máy tính bảng) |
| 12 | Khách chọn trả 100% nhưng chuyển thiếu | Staff bấm "Đã cọc" nếu số nhận ≥ 50%; nếu dưới 50% thì trả về Chờ thanh toán |
| 13 | Giới hạn ảnh khách tải lên | JPG/PNG/WebP, tối đa 10MB mỗi ảnh, 10 ảnh mỗi thiết kế; phải đăng nhập mới chèn ảnh |
| 14 | Thời gian Staff duyệt thiết kế | Trong 24 giờ kể từ khi đặt hoặc gửi lại (cam kết vận hành, hệ thống không tự động) |
| 15 | Khách không gửi lại thiết kế bị từ chối | Không tự hủy; Staff liên hệ và quyết định hủy/hoàn tiền |
| 16 | Thiết kế bị từ chối có được đổi màu/size | Không; chỉ đổi thiết kế. Muốn đổi áo thì hủy và đặt đơn mới |
| 17 | Ai được sửa mẫu email | Chỉ Admin (giống Cài đặt, Nội dung) |
| 18 | Mẫu email có lưu lịch sử phiên bản không | Không; chỉ lưu người và thời điểm sửa cuối, có nút Khôi phục mặc định |
| 19 | Mã giảm giá và combo có cộng dồn không | Không; áp dụng ưu đãi có lợi hơn cho khách |
| 20 | Giới hạn lượt dùng mã theo từng khách | Không; chỉ giới hạn tổng số lượt |
| 21 | Áo mẫu và áo custom có tính chung một loại trong combo không | Không; là hai loại riêng khi Admin tạo combo |

---

## 11. Kế hoạch triển khai

Mục tiêu ra mắt theo kế hoạch ban đầu: 08/10.

| Giai đoạn | Nội dung | Yêu cầu | Trạng thái |
|---|---|---|---|
| 1 | Khởi tạo dự án, cơ sở dữ liệu, đăng nhập Admin | FR12 | Xong |
| 2 | Nội dung và Admin quản lý nội dung, nhà tài trợ, tài khoản, cài đặt | FR01, FR09, FR10, FR17, FR19–FR21 | Xong |
| 3 | Canvas thiết kế, áo trơn, giỏ hàng | FR02–FR06 | Xong |
| 4 | Đặt hàng, VietQR, tra cứu đơn, email | FR07, FR11, FR22, FR24 | Xong |
| 4b | Tài khoản Người mua | FR26 | Xong (đăng nhập Google tạm tắt) |
| 5 | Admin: đơn hàng, xác nhận Đã cọc / Đã thanh toán 100% / Đã giao, duyệt thiết kế, đơn Workshop | FR13–FR16, FR29, §5 | Đã code, chờ kiểm thử với cơ sở dữ liệu |
| 5b | Mẫu email: trang Admin, biến, xem trước, gửi thử; chuyển mọi email sang dùng mẫu | FR24, FR30 | Đã code, chờ kiểm thử với cơ sở dữ liệu |
| 6 | Chèn ảnh/sticker vào canvas; khách sửa và gửi lại thiết kế bị từ chối | FR03, FR05, FR26, FR29, BR01 | Đã code, chờ kiểm thử với cơ sở dữ liệu |
| 7 | Áo mẫu (Staff/Admin quản lý, trang Áo mẫu, giỏ hàng, đặt hàng) và giới hạn điện thoại cho canvas | FR27, FR28, FR02, FR06, FR03, NFR02 | Đã code, chờ kiểm thử với cơ sở dữ liệu |
| 8 | Quyên góp, Bảng vinh danh, Google Sheets, tự hủy đơn, dọn ảnh sau 30 ngày | FR08, FR09, FR18, FR23, FR25, NFR06 | Đã code, chờ kiểm thử với cơ sở dữ liệu |
| 8b | Blindbox Hot Wheels, mã giảm giá, combo; giá mới; chỉ bán màu Đen | FR31, FR32, BR09, BR13 | Đã code, chờ kiểm thử với cơ sở dữ liệu (migration 0010) |
| 9 | Trang chủ mới: Hero, Áo mẫu, Về chúng tôi, Ý nghĩa, Vinh danh | FR01, FR17 | Đã code (migration 0011); đã kiểm thử giao diện 390/820/1440px (thêm menu điện thoại, sửa font); chờ nội dung thật |
| 9b | Kho áo: tồn kho áo trơn theo màu × size (trang Kho áo), giới hạn số lượng từng mẫu áo, trừ kho khi đặt hàng, trả lại khi Hủy/Hết hạn, chặn đặt khi hết hàng (web, giỏ hàng, Workshop), nhãn "Hết hàng" trên lưới Áo mẫu | §10 #7, FR02, FR06, FR16, FR27, FR28 | Đã code (migration 0012); đã kiểm thử với cơ sở dữ liệu và trên trình duyệt (trang khách, giỏ hàng); chờ kiểm thử trang Kho áo, form Workshop và bước đặt hàng (cần đăng nhập) |
| 9c | Nâng cấp UI/UX theo góp ý thiết kế: logo và bảng màu, breadcrumb, trang Cửa hàng, bỏ Áo mẫu khỏi web, trang chủ mới (S01), combo ở Áo trơn/Thiết kế, XL bị khóa, một trạng thái trong "Đơn hàng của tôi" (S17) | FR01, FR02, FR26, FR27, FR33 | Đã code (migration 0013, XL không khóa); đã kiểm thử giao diện 390/820/1440px |
| 9d | Header 2 tầng, Hero và footer theo thiết kế Figma; font Lexend + Tektur; ô tìm kiếm lọc Cửa hàng; trang Liên hệ; link TikTok trong cài đặt; đồng bộ giao diện mọi trang khách (nút bo tròn, tiêu đề trang chung, lưới 6xl); góp ý web: gộp Vinh danh vào trang Quyên góp, header "Tra cứu đơn hàng" luôn hiện, bỏ tên và nút Đăng xuất khỏi header, một nhãn trạng thái ở Tra cứu đơn hàng; đợt 2: ảnh áo thật làm mockup, vị trí/kích thước vùng in mới, popup cam kết khi thêm vào giỏ, 3 lựa chọn hiển thị khi quyên góp, mục Khuyến mãi riêng trong Admin, icon Tài khoản | FR01, FR04, FR05, FR08, FR09, FR11, FR17, FR21, FR33 | Đã code; đã kiểm thử giao diện 390/1280/1440px; đã chạy migration 0014, 0015 (01/10/2026) |
| 10 | Hoàn thiện, kiểm thử trên tablet, deploy, ra mắt | NFR | Chưa làm |
