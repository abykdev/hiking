import logo from '../assets/logo.png';
import notification from '../assets/header_notification.png';

export default function Header({ canGoBack, goBack }) {
    const openNotifFeed = () => {};
    return (
        <div id="topbar" className="topbar">
            {canGoBack ? (
                <button className="back-btn" onClick={goBack}>←</button>
            ) : (
                <div style={{ width: '36px' }}></div>
            )}
            <span className="display" style={{ fontSize: '15px', fontWeight: 600 }}>
                <span style={{ display: 'inline-flex', alignItems: 'flex-end', gap: '8px', lineHeight: 1 }}>
                    <img src={logo} alt="logo" style={{ height: '34px', width: 'auto', display: 'block' }} />
                    <span style={{ fontSize: '25px', lineHeight: 1, marginBottom: '-1px' }}>GirlPeak</span>
                </span>
            </span>
            <button
                className="back-btn"
                style={{ position: 'relative' }}
                onClick={openNotifFeed}
                aria-label="Notifications"
            >
                <span className="emo" style={{ backgroundImage: `url(${notification})` }}>🔔</span>
            </button>
        </div>
    );
}