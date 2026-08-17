<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-header">
        <h1>Đăng nhập</h1>
        <p>Chào mừng bạn quay lại hệ thống</p>
      </div>

      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label>Tên đăng nhập</label>
          <input
            type="text"
            v-model="username"
            placeholder="Nhập tên đăng nhập"
          />
        </div>

        <div class="form-group">
          <label>Mật khẩu</label>
          <input
            type="password"
            v-model="password"
            placeholder="Nhập mật khẩu"
          />
        </div>

        <div class="form-options">
          <label class="remember">
            <input type="checkbox" v-model="rememberMe" />
            Ghi nhớ đăng nhập
          </label>
        </div>

        <button type="submit" class="login-button">Đăng nhập</button>
        <p v-if="message" class="message">
          {{ message }}
        </p>
      </form>
    </div>
  </div>
</template>

<script>

export default {
  name: "LoginForm",
  // Khởi tạo dữ liệu form đăng nhập.
  data() {
    return {
      username: "",
      password: "",
      rememberMe: true,
      message: "",
    };
  },
  methods: {
    // Kiểm tra thông tin và phát sự kiện đăng nhập.
    // Lưu ý: đây là màn hình đăng nhập tạm/local, chưa gọi API xác thực thật.
    handleLogin() {
      if (!this.username || !this.password) {
        this.message = "Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.";
        return;
      }
      if (this.username != "admin" && this.username != "admin")
      {
          this.message = "Sai tài khoản hoặc mật khẩu";
          return;
      }
      this.$emit("login-success", {
        rememberMe: this.rememberMe,
        username: this.username.trim(),
      });
    },
  },
};
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--primary-color) 42%, var(--app-bg)),
    color-mix(in srgb, var(--sidebar-bg-color) 34%, var(--app-bg))
  );
  padding: 20px;
}

.login-card {
  width: 100%;
  max-width: 420px;
  background: var(--surface-bg);
  color: var(--text-color);
  border-radius: 18px;
  padding: 36px;
  box-shadow: 0 20px 45px color-mix(in srgb, var(--text-color) 22%, transparent);
}

.login-header {
  text-align: center;
  margin-bottom: 28px;
}

.login-header h1 {
  margin: 0;
  color: var(--text-color);
  font-size: 30px;
  font-weight: 700;
}

.login-header p {
  margin-top: 10px;
  color: var(--muted-color);
  font-size: 15px;
}

.form-group {
  margin-bottom: 18px;
}

.form-group label {
    text-align: left;
  display: block;
  margin-bottom: 8px;
  color: var(--text-color);
  font-size: 14px;
  font-weight: 600;
}

.form-group input {
  width: 100%;
  height: 40px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 5px;
  background: var(--surface-bg);
  color: var(--text-color);
  font-size: 15px;
  outline: none;
  transition: 0.2s;
}

.form-group input:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary-color) 18%, transparent);
}

.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 6px 0 22px;
  font-size: 14px;
}

.remember {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--muted-color);
}

.form-options a {
  color: var(--primary-color);
  text-decoration: none;
  font-weight: 600;
}

.form-options a:hover {
  text-decoration: underline;
}

.login-button {
  width: 100%;
  height: 48px;
  border: none;
  border-radius: 10px;
  background: var(--primary-color);
  color: #ffffff;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: 0.2s;
}

.login-button:hover {
  background: var(--primary-hover-color);
  transform: translateY(-1px);
}

.message {
  margin-top: 18px;
  padding: 12px;
  border-radius: 8px;
  background: var(--error-bg);
  color: var(--error-text);
  font-size: 14px;
  text-align: center;
}
</style>
