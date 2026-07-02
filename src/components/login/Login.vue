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
  data() {
    return {
      username: "",
      password: "",
      rememberMe: false,
      message: "",
    };
  },
  methods: {
    handleLogin() {
      if (!this.username || !this.password) {
        this.message = "Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.";
        return;
      }
      this.$emit("login-success");
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
  background: linear-gradient(135deg, #70bce7, #adf7d2);
  padding: 20px;
}

.login-card {
  width: 100%;
  max-width: 420px;
  background: #ffffff;
  border-radius: 18px;
  padding: 36px;
  box-shadow: 0 20px 45px rgba(0, 0, 0, 0.25);
}

.login-header {
  text-align: center;
  margin-bottom: 28px;
}

.login-header h1 {
  margin: 0;
  color: #1f2937;
  font-size: 30px;
  font-weight: 700;
}

.login-header p {
  margin-top: 10px;
  color: #6b7280;
  font-size: 15px;
}

.form-group {
  margin-bottom: 18px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #374151;
  font-size: 14px;
  font-weight: 600;
}

.form-group input {
  width: 100%;
  height: 40px;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  padding: 5px;
  font-size: 15px;
  outline: none;
  transition: 0.2s;
}

.form-group input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.18);
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
  color: #4b5563;
}

.form-options a {
  color: #2563eb;
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
  background: #2563eb;
  color: #ffffff;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: 0.2s;
}

.login-button:hover {
  background: #1d4ed8;
  transform: translateY(-1px);
}

.message {
  margin-top: 18px;
  padding: 12px;
  border-radius: 8px;
  background: #eff6ff;
  color: #ff0000;
  font-size: 14px;
  text-align: center;
}
</style>