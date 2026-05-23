import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Lock, Eye, EyeOff, Diamond, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useStore } from '@/hooks/useStore';
import { Badge } from '@/components/ui/badge';
import gsap from 'gsap';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showVault, setShowVault] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const login = useStore((state) => state.login);
  const systemSettings = useStore((state) => state.systemSettings);
  const vaultRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 金库门动画
    if (vaultRef.current && showVault) {
      gsap.to(vaultRef.current, {
        scaleY: 0,
        opacity: 0,
        duration: 1.2,
        ease: 'power3.inOut',
        delay: 0.5,
        onComplete: () => setShowVault(false),
      });
    }
  }, [showVault]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    setTimeout(() => {
      const result = login(username, password);
      if (!result.success) {
        setErrorMessage(result.message);
      }
      setIsLoading(false);
    }, 800);
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#1a1a1a]">
      {/* 背景动画 */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a] via-[#2a2a2a] to-[#1a1a1a]" />
        {/* 动态粒子背景 */}
        <div className="absolute inset-0 opacity-20">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-[#c9a962] rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -30, 0],
                opacity: [0.2, 0.8, 0.2],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>
        {/* 金色光晕 */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#c9a962] rounded-full blur-[200px] opacity-10" />
      </div>

      {/* 金库门覆盖层 */}
      <AnimatePresence>
        {showVault && (
          <motion.div
            ref={vaultRef}
            className="fixed inset-0 z-50 bg-[#c9a962] flex items-center justify-center"
            initial={{ scaleY: 1 }}
          >
            <div className="text-center">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              >
                <Diamond className="w-24 h-24 text-[#1a1a1a] mx-auto mb-4" />
              </motion.div>
              <motion.h1
                className="text-4xl font-bold text-[#1a1a1a] tracking-wider"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                全检钻仓管理系统
              </motion.h1>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 登录卡片 */}
      <motion.div
        ref={cardRef}
        className="relative z-10 min-h-screen flex items-center justify-center p-4"
        initial={{ opacity: 0, rotateX: 90 }}
        animate={{ opacity: showVault ? 0 : 1, rotateX: showVault ? 90 : 0 }}
        transition={{ duration: 0.8, delay: 0.8, ease: 'easeOut' }}
      >
        <div className="w-full max-w-md">
          {/* Logo区域 */}
          <motion.div
            className="text-center mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
          >
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-[#c9a962] to-[#a08042] mb-4 shadow-2xl">
              <Diamond className="w-10 h-10 text-[#1a1a1a]" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">全检钻仓管理系统</h1>
            <p className="text-gray-400">{systemSettings.systemName}</p>
          </motion.div>

          {/* 登录表单 */}
          <motion.div
            className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10 shadow-2xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
          >
            <div className="mb-6 rounded-xl border border-[#c9a962]/30 bg-[#c9a962]/10 p-4">
              <div className="mb-3 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#c9a962]" />
                <p className="text-sm font-medium text-[#f2deb0]">内部账号由管理员统一开通</p>
              </div>
              <div className="space-y-2 text-sm text-gray-300">
                <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                  <span>默认管理员</span>
                  <Badge className="bg-[#c9a962] text-[#1a1a1a] hover:bg-[#c9a962]">admin / admin123</Badge>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                  <span>演示质检员</span>
                  <Badge variant="secondary">zhangjian / 123456</Badge>
                </div>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              {/* 用户名输入 */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.3 }}
              >
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  用户名
                </label>
                <div className="relative group">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#c9a962] transition-colors" />
                  <Input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="请输入用户名"
                    className="pl-10 h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-[#c9a962] focus:ring-[#c9a962]/20 transition-all"
                  />
                </div>
              </motion.div>

              {/* 密码输入 */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.4 }}
              >
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  密码
                </label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#c9a962] transition-colors" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="请输入密码"
                    className="pl-10 pr-10 h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-[#c9a962] focus:ring-[#c9a962]/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </motion.div>

              {/* 记住我 */}
              <motion.div
                className="flex items-center justify-between"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5 }}
              >
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={!systemSettings.allowRememberMe}
                    className="w-4 h-4 rounded border-white/20 bg-white/5 text-[#c9a962] focus:ring-[#c9a962]"
                  />
                  <span className="text-sm text-gray-400">记住我</span>
                </label>
                <span className="text-sm text-[#c9a962]">忘记密码请联系管理员重置</span>
              </motion.div>

              {errorMessage ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
                >
                  {errorMessage}
                </motion.div>
              ) : null}

              {/* 登录按钮 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.6 }}
              >
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-gradient-to-r from-[#c9a962] to-[#a08042] hover:from-[#d4b876] hover:to-[#b08d52] text-[#1a1a1a] font-semibold text-lg rounded-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70"
                >
                  {isLoading ? (
                    <motion.div
                      className="w-6 h-6 border-2 border-[#1a1a1a] border-t-transparent rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    />
                  ) : (
                    '登录'
                  )}
                </Button>
              </motion.div>
            </form>
          </motion.div>

          {/* 底部信息 */}
          <motion.p
            className="text-center text-gray-500 text-sm mt-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.7 }}
          >
            系统版本 {systemSettings.version} | 技术支持：{systemSettings.supportContact} | 注册方式：管理员建号
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
}
