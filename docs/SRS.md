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
| Áo trơn | Áo không in, giá 79.000đ |
| Áo custom | Áo in bản vẽ khách tự vẽ trên canvas, giá 159.000đ |
| Blindbox Hot Wheels | Hộp xe Hot Wheels bí ẩn, giá 69.000đ, bán theo số hộp còn trong kho (FR32) |
| Mã giảm giá | Mã khách nhập khi đặt hàng để được giảm theo % hoặc số tiền (FR31) |
| Combo | Nhóm sản phẩm bán giá trọn gói, tự áp dụng khi giỏ hàng có đủ sản phẩm (FR31) |
| Áo mẫu (Prototype) | Áo in thiết kế có sẵn do Ban tổ chức đăng; mỗi mẫu có một màu áo cố định; giá bằng áo custom |
| Vùng in (Print Area) | Khu vực trên áo cho phép vẽ. Có 3 vùng |
| Cọc | Số tiền khách chuyển trước, tối thiểu 50% tổng đơn |
| Order Code | Mã đơn dạng `TUA0001`, dùng làm nội dung chuyển khoản |
| Donation Code | Mã quyên góp dạng `UH0001` |
| DPI | Số điểm mực trên mỗi inch khi in; quyết định độ nét |

---

## 2. Tổng quan nghiệp vụ

TỰA là nền tảng thương mại điện tử kết hợp gây quỹ cho chiến dịch "Nét Vẽ Yêu Thương". Có ba cách mua áo: (1) **Áo custom**: tự thiết kế trên canvas của website; (2) **Áo mẫu**: chọn một thiết kế có sẵn do Ban tổ chức đăng, giá bằng áo custom; (3) **Áo trơn**: chọn màu và size. Khi thiết kế áo custom, khách có thể vẽ, viết chữ và chèn ảnh/sticker của riêng mình (câu chuyện của họ). Để kiểm soát nội dung phản cảm và vi phạm bản quyền, **mọi thiết kế áo custom phải được Staff/Admin duyệt** trước khi in (FR29).

Một đơn hàng có thể chứa cả ba loại áo. Mỗi áo custom có bản thiết kế riêng; áo mẫu dùng thiết kế và file in của mẫu. Sau khi thiết kế, khách cam kết bản quyền, điền thông tin và chọn hình thức nhận hàng. Có hai hình thức: giao hàng (khách ở ngoài trường) hoặc nhận tại campus theo lịch hẹn. Khách chọn mức thanh toán trước 50%, 75% hoặc 100%. Hệ thống sinh mã VietQR có sẵn số tiền và nội dung chuyển khoản chứa Order Code. Khách quét mã, chuyển khoản, rồi bấm "Tôi đã chuyển khoản". Song song, Staff/Admin duyệt từng thiết kế custom (Chờ duyệt → Đang xem xét → Đã duyệt hoặc Bị từ chối kèm lý do). Thiết kế bị từ chối được khách sửa và gửi lại. Staff đối soát thủ công với sao kê ngân hàng rồi bấm "Đã cọc" (khách trả 50%/75%) hoặc "Đã thanh toán 100%".

Khách vẽ tay trên giấy tại Campus Workshop được Staff scan bản vẽ và tạo đơn thủ công trên Admin. Chỉ Staff được phép upload ảnh scan.

Mỗi đơn có hai trạng thái song song: **trạng thái thanh toán** (Chưa thanh toán → Đã cọc / Đã thanh toán 100%) và **trạng thái đơn** (Chờ thanh toán → Chờ xác nhận thanh toán → Đã xác nhận → Đang in → Kiểm tra chất lượng → Sẵn sàng giao/nhận → Đã giao). Đơn chưa thanh toán quá hạn sẽ tự động hủy.

Khách dùng điện thoại được xem nội dung, mua áo mẫu, mua áo trơn, quyên góp và theo dõi đơn. Tự thiết kế áo chỉ dùng trên máy tính hoặc máy tính bảng; trên điện thoại, khách được hướng dẫn dùng máy tính hoặc liên hệ Ban tổ chức để được hỗ trợ.

Toàn bộ dữ liệu đơn hàng, quyên góp và trạng thái được lưu trong cơ sở dữ liệu chính và đồng bộ sang Google Sheets để Ban tổ chức theo dõi minh bạch.

---

## 3. Tác nhân và phân quyền

| Tác nhân | Mô tả | Quyền |
|---|---|---|
| Khách (Guest) | Người truy cập, không cần đăng nhập | Xem nội dung, thiết kế, thêm vào giỏ hàng, quyên góp, tra cứu đơn |
| Người mua (Customer) | Khách đã đăng ký tài khoản (email + mật khẩu hoặc Google) | Toàn bộ quyền của Khách, cộng thêm: đặt hàng, xem lịch sử và theo dõi trạng thái đơn của mình, giỏ hàng được lưu theo tài khoản |
| Staff | Thành viên Ban tổ chức | Xử lý đơn hàng, xác nhận thanh toán, cập nhật trạng thái, tạo đơn Workshop, xác nhận quyên góp |
| Admin | Trưởng nhóm / quản trị | Toàn bộ quyền của Staff, cộng thêm: quản lý tài khoản, nội dung, nhà tài trợ, cài đặt (giá, thời hạn, tài khoản ngân hàng) |

Số lượng tài khoản Staff không giới hạn. Admin có thể thêm hoặc vô hiệu hóa tài khoản bất kỳ lúc nào.

---

## 4. Yêu cầu chức năng

### 4.1. Phía Khách hàng

**FR01 – Trang chủ và thông tin dự án**
Trang chủ gồm các phần theo thứ tự:
1. **Hero:** tiêu đề chiến dịch, câu giới thiệu ngắn, ảnh nền, các nút "Xem áo mẫu", "Tự thiết kế áo", "Quyên góp".
2. **Áo mẫu:** lưới các mẫu áo đang bán (ảnh, tên, giá), bấm vào để xem chi tiết (FR27). Có nút "Xem tất cả" tới trang Áo mẫu, kèm lối vào "Tự thiết kế áo" và "Mua áo trơn".
3. **Về chúng tôi:** giới thiệu nhóm thực hiện dự án (văn bản và ảnh).
4. **Ý nghĩa dự án:** câu chuyện "Nét Vẽ Yêu Thương", lợi nhuận được dùng như thế nào, đối tượng được hỗ trợ.
5. **Top 5 tranh của các bé, Campus Workshop và khuyến mãi đang hoạt động** (giữ như trước).
6. **Vinh danh:** tổng tiền đã quyên góp và thanh tiến độ so với mục tiêu; khoảng 10 khoản quyên góp đã xác nhận mới nhất, mỗi khoản hiển thị tên (hoặc "Nhà hảo tâm ẩn danh"), số tiền, lời nhắn, ngày; nút "Xem tất cả" tới Bảng vinh danh (FR09); logo nhà tài trợ theo hạng (FR10).
- Toàn bộ nội dung lấy từ cơ sở dữ liệu và được chỉnh sửa trong Admin (FR17, FR28). Phần nào chưa có dữ liệu thì ẩn đi.

**FR02 – Chọn sản phẩm**
- Khách chọn một trong ba loại áo: Áo custom (159.000đ, tự thiết kế), Áo mẫu (giá bằng áo custom, FR27) hoặc Áo trơn (79.000đ). Ngoài áo, khách mua được Blindbox Hot Wheels (69.000đ, FR32).
- Áo custom và áo trơn: chọn màu áo và size từ danh sách do Admin cấu hình. Áo mẫu: màu cố định theo mẫu, khách chỉ chọn size.
- Giá lấy từ bảng cài đặt, không hardcode.

**FR03 – Canvas thiết kế**
- Canvas hiển thị trên mockup áo. Khách chuyển giữa 3 vùng in; chỉ được vẽ trong vùng in, nét vẽ ngoài vùng bị cắt (clip).
- Công cụ: Cọ vẽ, Cục tẩy, Bảng màu, Kích thước cọ, Chữ (chọn kiểu chữ trong danh sách có sẵn, chữ đậm; kiểu chữ không hỗ trợ dấu tiếng Việt được ghi chú rõ), Hình khối (chữ nhật, tròn, đường thẳng), Tô màu (Fill), Lớp (Layers: thêm, xóa, ẩn/hiện, đổi thứ tự), Hoàn tác/Làm lại (tối thiểu 30 bước), Xóa toàn bộ vùng.
- Hoạt động trên máy tính (chuột) và máy tính bảng (cảm ứng, bút). Không cuộn trang khi đang vẽ.
- **Không dùng trên điện thoại** (thiết bị có cạnh ngắn màn hình dưới 600px). Trên điện thoại, trang Thiết kế áo không mở canvas mà hiển thị: "Tính năng tự thiết kế cần máy tính hoặc máy tính bảng", thông tin liên hệ Ban tổ chức để được hỗ trợ (FR21), và nút chuyển sang Áo mẫu / Áo trơn.
- Vùng in có thể để trống, nhưng áo custom phải có ít nhất 1 vùng có nội dung.
- **Chèn ảnh (sticker, hình ảnh):** khách đã đăng nhập được tải ảnh từ thiết bị lên canvas (BR01). Ảnh là một đối tượng trên lớp: di chuyển, phóng to/thu nhỏ, xoay, xóa như hình khối; bị cắt theo vùng in.
  - Định dạng JPG, PNG, WebP; tối đa 10MB mỗi ảnh; tối đa 10 ảnh mỗi thiết kế.
  - Ảnh được thu nhỏ trên trình duyệt về kích thước đủ in 200 DPI cho vùng in trước khi tải lên, và được lưu riêng tư (chỉ khách đó và Staff/Admin xem được).
  - Nếu ảnh quá nhỏ so với kích thước đang đặt trên áo (dưới 150 DPI khi in), hiển thị cảnh báo "Ảnh có thể bị mờ khi in".

**FR04 – Xem trước (Preview)**
- Hiển thị bản vẽ áp lên mockup áo theo màu áo đã chọn, xem được cả mặt trước và mặt sau.

**FR05 – Cam kết nội dung**
- Chỉ áp dụng cho áo custom (áo mẫu do Ban tổ chức thiết kế nên không cần cam kết).
- Trước khi thêm áo custom vào giỏ, khách phải tick đồng ý: nội dung do mình vẽ hoặc mình có quyền sử dụng (kể cả ảnh tải lên), không bạo lực, không phản cảm, không vi phạm bản quyền; và hiểu rằng thiết kế sẽ được Ban tổ chức duyệt, có thể bị từ chối. Nếu chưa tick, nút "Thêm vào giỏ" bị vô hiệu hóa.

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
- Khách nhập: tên hiển thị, email/SĐT, số tiền (tối thiểu 300.000đ), lời nhắn, lựa chọn "Hiển thị công khai trên Bảng vinh danh" hoặc "Ẩn danh".
- Hệ thống tạo Donation Code và sinh VietQR vào tài khoản quỹ (theo BR04).
- Gửi email xác nhận khi Staff xác nhận đã nhận tiền.

**FR09 – Bảng vinh danh nhà hảo tâm**
- Hiển thị các khoản quyên góp đã xác nhận: tên hiển thị (hoặc "Nhà hảo tâm ẩn danh"), số tiền, lời nhắn, ngày.
- Hiển thị tổng số tiền đã quyên góp và thanh tiến độ so với mục tiêu (Admin cấu hình).

**FR10 – Nhà tài trợ**
- Hiển thị logo nhà tài trợ, tên và liên kết tới website (mở tab mới). Có thể sắp xếp theo hạng tài trợ.

**FR11 – Tra cứu đơn hàng**
- Khách nhập Order Code và Số điện thoại, hệ thống hiển thị trạng thái đơn, trạng thái thanh toán, lịch sử trạng thái, số tiền đã thanh toán và số tiền còn lại.
- Nếu đơn đang ở trạng thái Chờ thanh toán, hiển thị lại mã QR.

**FR27 – Áo mẫu (Prototype)**
- Trang "Áo mẫu" (`/mau-ao`) hiển thị lưới các mẫu đang bán theo thứ tự Admin sắp xếp: ảnh, tên, giá.
- Trang chi tiết mẫu (`/mau-ao/[slug]`): ảnh mặt trước/mặt sau (có thể nhiều ảnh), tên, mô tả, màu áo, giá, chọn size và số lượng, nút "Thêm vào giỏ".
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
- Sửa nội dung Hero (tiêu đề, câu giới thiệu, ảnh nền), Về chúng tôi, Ý nghĩa dự án, câu chuyện dự án (văn bản và ảnh), Top 5 tranh (ảnh, tên bé hoặc biệt danh, mô tả), thông tin sự kiện, khuyến mãi (tiêu đề, mô tả, ảnh, giá, thời gian hiển thị, bật/tắt).

**FR18 – Quản lý quyên góp**
- Danh sách quyên góp; Staff xác nhận đã nhận tiền hoặc hủy. Admin có thể ẩn một mục khỏi Bảng vinh danh.

**FR19 – Quản lý nhà tài trợ (Admin)**
- Thêm, sửa, xóa nhà tài trợ: tên, logo, website, hạng, thứ tự hiển thị, bật/tắt.

**FR20 – Quản lý tài khoản (Admin)**
- Tạo tài khoản Staff/Admin, đổi vai trò, vô hiệu hóa, đặt lại mật khẩu.

**FR21 – Cài đặt hệ thống (Admin)**
- Giá áo trơn và áo custom, danh sách màu và size, thời hạn tự hủy đơn (mặc định 24 giờ), thông tin 2 tài khoản ngân hàng (bán hàng và quỹ), mục tiêu quyên góp, số tiền quyên góp tối thiểu, thông tin liên hệ Ban tổ chức (số điện thoại/Zalo, Facebook, email) hiển thị cho khách cần hỗ trợ thiết kế.

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

**FR31 – Mã giảm giá và combo (Admin)**
- **Mã giảm giá:** Admin tạo, sửa, bật/tắt, xóa mã. Mỗi mã có: mã (chữ không dấu, số, `-`, `_`), kiểu giảm (theo % hoặc số tiền cố định), mức giảm, giảm tối đa (chỉ cho kiểu %), đơn tối thiểu (tính trên tiền hàng trước giảm), tổng số lượt dùng (để trống = không giới hạn), thời gian áp dụng từ/đến.
- Lượt dùng tính theo số đơn chưa Hủy/Hết hạn có dùng mã; đơn bị hủy hoặc hết hạn được trả lượt. Mã đã có trong đơn không xóa được, chỉ tắt.
- **Combo:** Admin tạo, sửa, bật/tắt, xóa combo gồm tên, mô tả, các sản phẩm và số lượng (Áo custom, Áo mẫu, Áo trơn, Blindbox), giá combo, thời gian áp dụng, thứ tự. Combo chỉ được áp dụng khi giá combo thấp hơn tổng giá lẻ.
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
- Đăng ký bằng email + mật khẩu (tối thiểu 8 ký tự) kèm Họ tên và Số điện thoại. Tài khoản chỉ dùng được sau khi bấm liên kết xác thực gửi qua email.
- Đăng nhập bằng email + mật khẩu hoặc bằng Google. Người dùng Google không bắt buộc nhập SĐT khi đăng ký; SĐT được hỏi ở bước đặt hàng và lưu lại vào tài khoản.
- Có chức năng đăng xuất. Khi đăng xuất, giỏ hàng trên trình duyệt được xóa (vẫn còn lưu trong tài khoản).
- Trang "Tài khoản": xem và sửa Họ tên, SĐT; danh sách đơn đã đặt (mã đơn, ngày, trạng thái đơn, trạng thái thanh toán, tổng tiền, đã trả); xem chi tiết và lịch sử trạng thái từng đơn, trạng thái duyệt của từng áo custom và lý do nếu bị từ chối; sửa và gửi lại thiết kế bị từ chối (FR29); thanh toán lại đơn đang Chờ thanh toán.
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
- Chỉ Staff/Admin đổi được trạng thái thanh toán, bằng các nút trên. Khách bấm "Tôi đã chuyển khoản" chỉ chuyển trạng thái đơn sang Chờ xác nhận thanh toán.
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
- **NFR02 – Tương thích:** Chrome, Safari, Edge bản mới nhất. Điện thoại: xem nội dung, mua áo mẫu, mua áo trơn, giỏ hàng, đặt hàng, thanh toán, quyên góp, tài khoản và tra cứu đơn. Máy tính bảng và máy tính: toàn bộ tính năng, kể cả tự thiết kế áo (FR03).
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
- **BR04:** Tiền bán hàng và tiền quyên góp dùng hai tài khoản ngân hàng riêng (hoặc cùng tài khoản nhưng khác tiền tố nội dung `TUA` / `UH`) để đối soát.
- **BR05:** Thiết kế có nội dung phản cảm, bạo lực hoặc vi phạm bản quyền (kể cả ảnh tải lên) bị từ chối kèm lý do (FR29). Khách sửa và gửi lại, hoặc Staff hủy đơn.
- **BR06:** Hoàn tiền được Ban tổ chức quyết định theo từng trường hợp và ghi nhận bằng `refund_status`.
- **BR07:** Đơn ở trạng thái Chờ thanh toán quá thời hạn cấu hình (mặc định 24 giờ) tự động chuyển sang Hết hạn.
- **BR08:** Số tiền quyên góp tối thiểu là 300.000đ.
- **BR09:** Giá áo trơn 79.000đ, áo custom 159.000đ, Blindbox Hot Wheels 69.000đ, cấu hình được trong Admin. Áo mẫu dùng giá áo custom. Giá và số tiền giảm được "chốt" vào đơn tại thời điểm đặt.
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
| `settings` | key, value (JSON): giá (áo trơn, áo custom, blindbox), màu, size, blindbox (tên, mô tả, ảnh, tổng số hộp, bật/tắt), vùng in, tài khoản ngân hàng, thời hạn hủy, mục tiêu quỹ, liên hệ Ban tổ chức |
| `orders` | id, code, source (WEB/WORKSHOP), customer_name, phone, email, fulfillment (DELIVERY/PICKUP), address, preferred_time, pickup_location, note, items_total, discount_amount, discount_note, promo_code_id, subtotal (sau giảm), prepay_percent, prepay_amount, paid_amount, status, payment_status (UNPAID/DEPOSIT_PAID/FULLY_PAID), refund_status, cancel_reason, expires_at, created_by, customer_id, created_at |
| `order_items` | id, order_id, type (PLAIN/CUSTOM/PROTOTYPE/BLINDBOX), color, size, quantity, unit_price, design_id, prototype_id, approval_status, reject_reason, reviewed_by, reviewed_at |
| `design_reviews` | id, order_item_id, from_status, to_status, reason, changed_by (null = khách gửi lại), design_id, changed_at |
| `design_assets` | id, customer_id, file_path, width_px, height_px, bytes, created_at (ảnh khách tải lên, bucket riêng tư) |
| `prototypes` | id, slug, name, description, color, image_urls, design_id (file in), sort_order, is_active, created_at |
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

**Public:** Trang chủ · Áo mẫu · Chi tiết áo mẫu · Blindbox · Đăng nhập · Đăng ký · Tài khoản (lịch sử đơn) · Thiết kế áo (canvas) · Chọn áo trơn · Giỏ hàng · Thanh toán (thông tin) · Thanh toán (QR) · Tra cứu đơn · Quyên góp · Quyên góp (QR) · Bảng vinh danh · Nhà tài trợ · Chính sách dữ liệu và điều khoản.

**Admin:** Đăng nhập · Dashboard · Mẫu áo · Blindbox · Giảm giá (mã giảm giá, combo) · Danh sách đơn · Chi tiết đơn · Tạo đơn Workshop · Quyên góp · Nội dung (câu chuyện, Top 5, sự kiện, khuyến mãi) · Nhà tài trợ · Mẫu email · Tài khoản · Cài đặt.

---

## 10. Giả định và câu hỏi còn mở

| # | Nội dung | Giả định tạm thời |
|---|---|---|
| 1 | Kích thước và vị trí 3 vùng in | Ngực trái 10×10cm, mặt trước 25×30cm, mặt sau 30×40cm (chỉnh trong Cài đặt) |
| 2 | Quyền lợi khi quyên góp trên 300.000đ (câu trả lời bị cắt) | Chưa xác định |
| 3 | Bộ nhận diện (màu, font, logo) | Nhóm thiết kế sẽ cung cấp; tạm dùng bảng màu trung tính |
| 4 | Danh sách màu áo và size | Chỉ màu Đen (đã bỏ Trắng và Be; đơn cũ vẫn giữ màu đã đặt); S, M, L, XL, XXL |
| 5 | Ngân hàng và số tài khoản | Cấu hình trong Cài đặt |
| 6 | Khuyến mãi có giảm giá vào giỏ hàng không | Khuyến mãi (FR17) vẫn chỉ là nội dung hiển thị; giảm giá thật dùng mã giảm giá và combo (FR31) |
| 7 | Áo mẫu có giới hạn số lượng (tồn kho) không | Không giới hạn; Admin tắt bán khi cần |
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
| 9 | Trang chủ mới: Hero, Áo mẫu, Về chúng tôi, Ý nghĩa, Vinh danh | FR01, FR17 | Đã code (migration 0011); chờ nội dung thật và kiểm thử giao diện 390/820/1440px |
| 10 | Hoàn thiện, kiểm thử trên tablet, deploy, ra mắt | NFR | Chưa làm |
