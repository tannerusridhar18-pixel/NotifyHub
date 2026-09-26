import styles from "@/app/auth/AuthKit.module.css";

export default function AuthFloatingCards() {
  return (
    <div className={styles["authkit-orbit"]} aria-hidden="true">
      <div className={`${styles["authkit-float"]} ${styles["authkit-float-left"]}`}>
        <span className={styles["authkit-float-line"]} />
        <span className={styles["authkit-float-line"]} />
        <span className={styles["authkit-float-dot"]} />
      </div>

      <div className={`${styles["authkit-float"]} ${styles["authkit-float-right"]}`}>
        <span className={styles["authkit-float-line"]} />
        <span className={styles["authkit-float-line"]} />
        <span className={styles["authkit-float-dot"]} />
      </div>

      <div className={styles["authkit-orbit-ring"]} />
      <div className={styles["authkit-orbit-glow"]} />
    </div>
  );
}
