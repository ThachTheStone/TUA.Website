import type { Metadata } from "next";
import Link from "next/link";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Chính sách dữ liệu và điều khoản",
  description: "Cách TỰA thu thập, sử dụng và bảo vệ dữ liệu cá nhân theo Nghị định 13/2023/NĐ-CP, và điều khoản đặt hàng.",
};
export const dynamic = "force-dynamic";

const UPDATED = "27/09/2026";

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="flex scroll-mt-20 flex-col gap-3">
      <h2 className="text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

/** NFR06: personal data policy (Nghị định 13/2023/NĐ-CP) and order terms, linked from every consent checkbox. */
export default async function PolicyPage() {
  const { contact, order_expire_hours } = await getSettings();
  const hasContact = !!(contact.phone || contact.email || contact.facebook);

  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-10 leading-relaxed [&_li]:ml-5 [&_li]:list-disc [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Chính sách dữ liệu và điều khoản</h1>
        <p className="text-sm text-muted-foreground">Cập nhật: {UPDATED}</p>
        <p className="text-muted-foreground">
          Trang này giải thích Ban tổ chức dự án TỰA – Nét Vẽ Yêu Thương (&quot;chúng mình&quot;) thu thập, sử dụng và bảo vệ dữ
          liệu cá nhân của bạn như thế nào, theo Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân, và các điều khoản khi đặt áo
          hoặc quyên góp.
        </p>
        <nav className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <a href="#du-lieu" className="underline underline-offset-4">Dữ liệu cá nhân</a>
          <a href="#quyen" className="underline underline-offset-4">Quyền của bạn</a>
          <a href="#dieu-khoan" className="underline underline-offset-4">Điều khoản đặt hàng</a>
          <a href="#lien-he" className="underline underline-offset-4">Liên hệ</a>
        </nav>
      </header>

      <Section id="du-lieu" title="1. Dữ liệu chúng mình thu thập">
        <ul>
          <li>
            <strong>Khi tạo tài khoản và đặt áo:</strong> họ tên, số điện thoại, email; địa chỉ giao hàng hoặc địa điểm và thời gian
            hẹn nhận; ghi chú của bạn.
          </li>
          <li>
            <strong>Khi thiết kế áo:</strong> bản thiết kế trên bảng vẽ và ảnh bạn chèn vào bằng công cụ &quot;Chèn ảnh&quot;.
          </li>
          <li>
            <strong>Khi quyên góp:</strong> tên hiển thị, thông tin liên hệ, số tiền và lời nhắn.
          </li>
          <li>
            <strong>Thanh toán:</strong> chúng mình chỉ ghi nhận số tiền và thời điểm đã nhận. Chúng mình không thu thập hay lưu số
            thẻ, mật khẩu ngân hàng hoặc thông tin đăng nhập ngân hàng của bạn.
          </li>
        </ul>
      </Section>

      <Section id="muc-dich" title="2. Mục đích sử dụng">
        <ul>
          <li>Thực hiện đơn hàng: in áo, giao hoặc hẹn nhận, xác nhận thanh toán.</li>
          <li>Liên hệ với bạn về đơn hàng, thiết kế cần chỉnh sửa, hoặc khoản quyên góp; gửi email cập nhật trạng thái.</li>
          <li>
            Ghi nhận và công khai khoản quyên góp trên Bảng vinh danh: chỉ hiện tên hiển thị, số tiền, lời nhắn và ngày. Nếu bạn
            chọn ẩn danh, tên hiện là &quot;Nhà hảo tâm ẩn danh&quot;. Thông tin liên hệ không bao giờ được công khai.
          </li>
          <li>Đối soát tài chính và báo cáo minh bạch cho chiến dịch gây quỹ.</li>
        </ul>
        <p>Chúng mình không bán, cho thuê hay dùng dữ liệu của bạn cho quảng cáo.</p>
      </Section>

      <Section id="luu-tru" title="3. Ai được xem và nơi lưu trữ">
        <ul>
          <li>Chỉ thành viên Ban tổ chức có tài khoản quản trị mới xem được thông tin khách hàng và nhà hảo tâm.</li>
          <li>
            Dữ liệu được lưu trên các dịch vụ chúng mình dùng để vận hành website: Supabase (cơ sở dữ liệu và lưu trữ ảnh), Vercel
            (máy chủ website), Google Sheets (bản sao riêng tư để Ban tổ chức theo dõi) và Gmail (gửi email thông báo).
          </li>
          <li>Tra cứu đơn hàng trên website yêu cầu nhập đúng cả mã đơn và số điện thoại.</li>
        </ul>
      </Section>

      <Section id="anh" title="4. Ảnh bạn tải lên và ảnh của các bé">
        <ul>
          <li>
            Ảnh bạn chèn vào thiết kế được lưu riêng tư, không công khai trên mạng, và chỉ dùng để in đơn áo của chính bạn.
          </li>
          <li>
            Ảnh thuộc đơn hàng đã hết hạn hoặc đã hủy, và ảnh không nằm trong đơn hàng nào, được tự động xóa sau 30 ngày.
          </li>
          <li>
            Tranh và ảnh của các bé trên website chỉ ghi tên hoặc biệt danh, và chỉ được đăng khi có sự đồng ý của mái ấm.
          </li>
        </ul>
      </Section>

      <Section id="thoi-gian" title="5. Thời gian lưu trữ">
        <p>
          Dữ liệu đơn hàng và quyên góp được lưu trong thời gian cần thiết để thực hiện đơn, đối soát và báo cáo minh bạch cho
          chiến dịch. Bạn có thể yêu cầu xóa dữ liệu của mình bất kỳ lúc nào (xem mục 6), trừ những thông tin cần giữ lại để đối
          soát các khoản tiền đã nhận.
        </p>
      </Section>

      <Section id="quyen" title="6. Quyền của bạn">
        <p>Theo Nghị định 13/2023/NĐ-CP, bạn có quyền:</p>
        <ul>
          <li>Được biết về việc xử lý dữ liệu và xem dữ liệu của mình.</li>
          <li>
            Chỉnh sửa dữ liệu: họ tên và số điện thoại sửa được trong trang{" "}
            <Link href="/tai-khoan" className="underline underline-offset-4">Tài khoản</Link>.
          </li>
          <li>Rút lại sự đồng ý, yêu cầu hạn chế xử lý hoặc yêu cầu xóa dữ liệu.</li>
          <li>Phản đối việc xử lý dữ liệu, khiếu nại và yêu cầu bồi thường theo quy định pháp luật.</li>
        </ul>
        <p>Để thực hiện các quyền này, hãy liên hệ Ban tổ chức (mục 8). Chúng mình sẽ phản hồi sớm nhất có thể.</p>
      </Section>

      <Section id="dieu-khoan" title="7. Điều khoản đặt hàng và quyên góp">
        <ul>
          <li>
            Bạn cam kết nội dung thiết kế do bạn tự vẽ hoặc có quyền sử dụng (kể cả ảnh tải lên), không bạo lực, không phản cảm,
            không vi phạm bản quyền.
          </li>
          <li>
            Mọi thiết kế áo custom đều được Ban tổ chức duyệt trước khi in. Thiết kế bị từ chối sẽ có lý do; bạn có thể sửa và gửi
            lại trong trang Tài khoản.
          </li>
          <li>
            Đơn hàng cần thanh toán trước (cọc hoặc toàn bộ) qua chuyển khoản theo mã QR trong vòng {order_expire_hours} giờ; quá
            thời hạn đơn sẽ tự hủy.
          </li>
          <li>Giá áo được giữ nguyên theo thời điểm đặt hàng. Phí vận chuyển (nếu giao hàng) bạn trả trực tiếp cho đơn vị vận chuyển.</li>
          <li>
            Nếu đơn bị hủy sau khi bạn đã chuyển khoản, việc hoàn tiền do Ban tổ chức quyết định theo từng trường hợp và liên hệ
            trực tiếp với bạn.
          </li>
          <li>Toàn bộ lợi nhuận và tiền quyên góp được dùng để hỗ trợ trẻ em có hoàn cảnh đặc biệt.</li>
        </ul>
      </Section>

      <Section id="lien-he" title="8. Liên hệ">
        {hasContact ? (
          <ul>
            {contact.phone && <li>Điện thoại / Zalo: {contact.phone}</li>}
            {contact.email && (
              <li>
                Email:{" "}
                <a href={`mailto:${contact.email}`} className="underline underline-offset-4">
                  {contact.email}
                </a>
              </li>
            )}
            {contact.facebook && (
              <li>
                Facebook:{" "}
                <a href={contact.facebook} target="_blank" rel="noopener noreferrer" className="break-all underline underline-offset-4">
                  {contact.facebook}
                </a>
              </li>
            )}
          </ul>
        ) : (
          <p>Vui lòng liên hệ Ban tổ chức dự án TỰA tại các buổi Workshop hoặc qua email xác nhận đơn hàng.</p>
        )}
      </Section>
    </article>
  );
}
