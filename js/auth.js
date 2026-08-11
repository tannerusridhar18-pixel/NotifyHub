const ROLE_NAMES = {
  admin: "Admin",
  faculty: "Faculty",
  student: "Student",
};

const MESSAGES = {
  login: {
    admin: "Admin sign-in simulated successfully. Your administration dashboard would open next.",
    faculty: "Faculty sign-in simulated successfully. Your announcement workspace would open next.",
    student: "Student sign-in simulated successfully. Your campus updates feed would open next.",
  },
  register: {
    admin: "Admin registration simulated successfully. Your account is ready for approval flow UI.",
    faculty: "Faculty registration simulated successfully. Your faculty profile has been prepared.",
    student: "Student registration simulated successfully. Your student profile has been prepared.",
  },
};

document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector(".auth-card");
  if (!form) {
    return;
  }

  const mode = form.dataset.mode;
  const role = form.dataset.role;
  const alertBox = form.querySelector(".form-alert");
  const submitButton = form.querySelector(".submit-button");

  bindPasswordToggles(form);
  bindRememberMe(form, role);
  bindLiveValidation(form, mode);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    hideAlert(alertBox);

    const validation = validateForm(form, mode);
    if (!validation.valid) {
      showAlert(alertBox, "Please review the highlighted fields and try again.", "error");
      validation.firstInvalid?.focus();
      return;
    }

    const defaultLabel = mode === "login" ? "Login" : "Register";
    submitButton.disabled = true;
    submitButton.textContent = mode === "login" ? "Signing in..." : "Creating account...";

    await delay(1200);

    submitButton.disabled = false;
    submitButton.textContent = defaultLabel;
    showAlert(alertBox, MESSAGES[mode][role], "success");

    if (mode === "register") {
      form.reset();
    }
  });
});

function bindPasswordToggles(form) {
  form.querySelectorAll(".toggle-password").forEach((button) => {
    button.addEventListener("click", () => {
      const targetName = button.dataset.target;
      const field = form.querySelector(`[name="${targetName}"]`);
      if (!field) {
        return;
      }

      const isPassword = field.type === "password";
      field.type = isPassword ? "text" : "password";
      button.textContent = isPassword ? "Hide" : "Show";
      button.setAttribute("aria-label", isPassword ? "Hide password" : "Show password");
    });
  });
}

function bindRememberMe(form, role) {
  const remember = form.querySelector('[name="remember"]');
  if (!remember) {
    return;
  }

  const key = `notifyhub-remember-${role}`;
  remember.checked = window.localStorage.getItem(key) === "true";

  remember.addEventListener("change", () => {
    window.localStorage.setItem(key, String(remember.checked));
  });
}

function bindLiveValidation(form, mode) {
  const inputs = form.querySelectorAll("input, select");
  inputs.forEach((input) => {
    input.addEventListener("input", () => {
      validateField(input, form, mode);
      if (input.name === "password" || input.name === "confirmPassword") {
        const partner = input.name === "password"
          ? form.querySelector('[name="confirmPassword"]')
          : form.querySelector('[name="password"]');
        if (partner) {
          validateField(partner, form, mode);
        }
      }
    });

    input.addEventListener("blur", () => {
      validateField(input, form, mode);
    });
  });
}

function validateForm(form, mode) {
  const fields = Array.from(form.querySelectorAll("input, select"));
  let firstInvalid = null;

  fields.forEach((field) => {
    const isValid = validateField(field, form, mode);
    if (!isValid && !firstInvalid && field.type !== "checkbox") {
      firstInvalid = field;
    }
  });

  const valid = !form.querySelector(".is-invalid, .checkbox-error:not(:empty)");
  if (!firstInvalid) {
    firstInvalid = form.querySelector(".is-invalid");
  }

  return { valid, firstInvalid };
}

function validateField(field, form, mode) {
  const wrapper = field.closest(".field");
  const fieldError = wrapper
    ? wrapper.querySelector(".field-error")
    : form.querySelector(".checkbox-error");

  let message = "";
  const value = field.type === "checkbox" ? field.checked : field.value.trim();

  if (field.required && ((field.type === "checkbox" && !field.checked) || value === "")) {
    message = field.type === "checkbox"
      ? "You must agree before continuing."
      : `${labelFor(field)} is required.`;
  } else if ((field.type === "email" || field.name === "email") && value && !isEmail(value)) {
    message = "Enter a valid email address.";
  } else if (field.name === "password" && value) {
    const strength = passwordStrengthError(value, mode);
    if (strength) {
      message = strength;
    }
  } else if (field.name === "confirmPassword" && value) {
    const password = form.querySelector('[name="password"]')?.value ?? "";
    if (value !== password) {
      message = "Passwords do not match.";
    }
  }

  if (field.type === "text" && /id$/i.test(field.name) && value.length > 0 && value.length < 4) {
    message = `${labelFor(field)} must be at least 4 characters.`;
  }

  if (field.name === "fullName" && value && value.length < 3) {
    message = "Full Name must be at least 3 characters.";
  }

  if (field.name === "identifier" && value && value.length < 3) {
    message = `${ROLE_NAMES[form.dataset.role]} login ID must be at least 3 characters.`;
  }

  if (fieldError) {
    fieldError.textContent = message;
  }

  toggleInvalidState(field, wrapper, message);
  return message === "";
}

function toggleInvalidState(field, wrapper, message) {
  const invalid = message !== "";

  if (wrapper) {
    wrapper.classList.toggle("is-invalid", invalid);
  }

  if (field.type === "checkbox") {
    return;
  }

  field.classList.toggle("is-invalid", invalid);
  field.setAttribute("aria-invalid", invalid ? "true" : "false");
}

function passwordStrengthError(value, mode) {
  if (value.length < 8) {
    return "Password must be at least 8 characters.";
  }
  if (!/[A-Z]/.test(value)) {
    return "Password must include at least one uppercase letter.";
  }
  if (!/[a-z]/.test(value)) {
    return "Password must include at least one lowercase letter.";
  }
  if (!/\d/.test(value)) {
    return "Password must include at least one number.";
  }
  if (mode === "register" && !/[!@#$%^&*(),.?":{}|<>_\-\\[\]/+=~`]/.test(value)) {
    return "Password must include at least one special character.";
  }

  return "";
}

function labelFor(field) {
  const label = field.closest(".field")?.querySelector("span");
  return label ? label.textContent : "This field";
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function showAlert(element, message, type) {
  element.textContent = message;
  element.className = `form-alert is-visible is-${type}`;
}

function hideAlert(element) {
  element.textContent = "";
  element.className = "form-alert";
}

function delay(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
