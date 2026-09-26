import styles from "@/app/auth/AuthKit.module.css";

function MiniAuthCard({ side }: { side: "left" | "right" }) {
  return (
    <div
      className={`${styles["authkit-float"]} ${styles[`authkit-float-${side}`]}`}
    >
      <div className={styles["authkit-mini-top"]}>
        <span className={styles["authkit-mini-logo"]}>◈</span>
        <span className={styles["authkit-mini-status"]} />
      </div>
      <span className={styles["authkit-mini-heading"]} />
      <span className={styles["authkit-mini-copy"]} />
      <span className={styles["authkit-mini-input"]} />
      <span className={styles["authkit-mini-input short"]} />
      <span className={styles["authkit-mini-button"]} />
    </div>
  );
}

export default function AuthFloatingCards() {
  return (
    <div className={styles["authkit-orbit"]} aria-hidden="true">
      <MiniAuthCard side="left" />
      <MiniAuthCard side="right" />
      <div className={styles["authkit-orbit-ring"]} />
      <div className={styles["authkit-orbit-glow"]} />
    </div>
  );
}
