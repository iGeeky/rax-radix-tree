#include <napi.h>
#include <string>
#include <iostream>

extern "C" {
#include "radix_tree.h"
}

class RaxIterator : public Napi::ObjectWrap<RaxIterator> {
public:
  static Napi::Object Init(Napi::Env env, Napi::Object exports);
  RaxIterator(const Napi::CallbackInfo& info);

private:
  static Napi::FunctionReference constructor;
  radix_iterator* iterator;
  radix_tree* tree;
  rt_str_t path;

  Napi::Value Next(const Napi::CallbackInfo& info);
  Napi::Value Prev(const Napi::CallbackInfo& info);
  Napi::Value Up(const Napi::CallbackInfo& info);
  Napi::Value Stop(const Napi::CallbackInfo& info);

  friend class RadixTree;
};

class RadixTree : public Napi::ObjectWrap<RadixTree> {
public:
  static Napi::Object Init(Napi::Env env, Napi::Object exports);
  RadixTree(const Napi::CallbackInfo& info);

private:
  static Napi::FunctionReference constructor;
  radix_tree* tree;
  radix_iterator* treeIt;

  Napi::Value Insert(const Napi::CallbackInfo& info);
  Napi::Value Remove(const Napi::CallbackInfo& info);
  Napi::Value Find(const Napi::CallbackInfo& info);
  Napi::Value Search(const Napi::CallbackInfo& info);
  void Cleanup(const Napi::CallbackInfo& info);
};

Napi::FunctionReference RaxIterator::constructor;
Napi::FunctionReference RadixTree::constructor;

// RaxIterator implementation
Napi::Object RaxIterator::Init(Napi::Env env, Napi::Object exports) {
  Napi::HandleScope scope(env);

  Napi::Function func = DefineClass(env, "RaxIterator", {
    InstanceMethod("next", &RaxIterator::Next),
    InstanceMethod("prev", &RaxIterator::Prev),
    InstanceMethod("up", &RaxIterator::Up),
    InstanceMethod("stop", &RaxIterator::Stop),
  });

  constructor = Napi::Persistent(func);
  constructor.SuppressDestruct();

  exports.Set("RaxIterator", func);
  return exports;
}

RaxIterator::RaxIterator(const Napi::CallbackInfo& info) : Napi::ObjectWrap<RaxIterator>(info) {
  Napi::Env env = info.Env();
  if (info.Length() < 3 || !info[0].IsExternal() || !info[1].IsExternal() || !info[2].IsString()) {
    Napi::TypeError::New(env, "Invalid arguments").ThrowAsJavaScriptException();
    return;
  }

  this->tree = info[0].As<Napi::External<radix_tree>>().Data();
  this->iterator = info[1].As<Napi::External<radix_iterator>>().Data();
  
  // Initialize path
  std::string pathStr = info[2].As<Napi::String>().Utf8Value();
  this->path.buf = new unsigned char[pathStr.length()];
  memcpy(this->path.buf, pathStr.c_str(), pathStr.length());
  this->path.len = pathStr.length();
}

Napi::Value RaxIterator::Next(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  int result = raxtree_next(this->iterator, &this->path);
  return Napi::Number::New(env, result);
}

Napi::Value RaxIterator::Prev(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  int result = raxtree_prev(this->iterator, &this->path);
  return Napi::Number::New(env, result);
}

Napi::Value RaxIterator::Up(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  int result = raxtree_up(this->iterator, &this->path);
  return Napi::Number::New(env, result);
}

Napi::Value RaxIterator::Stop(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  raxtree_stop(this->iterator);
  return env.Undefined();
}

// RadixTree implementation
Napi::Object RadixTree::Init(Napi::Env env, Napi::Object exports) {
  Napi::HandleScope scope(env);

  Napi::Function func = DefineClass(env, "RadixTree", {
    InstanceMethod("insert", &RadixTree::Insert),
    InstanceMethod("remove", &RadixTree::Remove),
    InstanceMethod("find", &RadixTree::Find),
    InstanceMethod("search", &RadixTree::Search),
    InstanceMethod("cleanup", &RadixTree::Cleanup),
  });

  constructor = Napi::Persistent(func);
  constructor.SuppressDestruct();

  exports.Set("RadixTree", func);
  return exports;
}

RadixTree::RadixTree(const Napi::CallbackInfo& info) : Napi::ObjectWrap<RadixTree>(info) {
  this->tree = raxtree_new();
  this->treeIt = raxtree_new_it(this->tree);
}

Napi::Value RadixTree::Insert(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 2) {
    Napi::TypeError::New(env, "Wrong number of arguments").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  std::string key = info[0].As<Napi::String>().Utf8Value();
  
  if (!info[1].IsNumber()) {
    Napi::TypeError::New(env, "Second argument must be an integer").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  int64_t value = info[1].As<Napi::Number>().Int64Value();
  
  if (value > INT_MAX || value < INT_MIN) {
    Napi::RangeError::New(env, "Value is out of range for int").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  rt_str_t path;
  path.buf = (unsigned char*)key.c_str();
  path.len = key.length();
  
  int result = raxtree_insert(this->tree, &path, static_cast<int>(value));
  return Napi::Number::New(env, result);
}

Napi::Value RadixTree::Remove(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 1) {
    Napi::TypeError::New(env, "Wrong number of arguments").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  std::string key = info[0].As<Napi::String>().Utf8Value();
  
  rt_str_t path;
  path.buf = (unsigned char*)key.c_str();
  path.len = key.length();
  
  int result = raxtree_remove(this->tree, &path);
  
  return Napi::Number::New(env, result);
}

Napi::Value RadixTree::Find(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 1) {
    Napi::TypeError::New(env, "Wrong number of arguments").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  std::string key = info[0].As<Napi::String>().Utf8Value();
  
  rt_str_t path;
  path.buf = (unsigned char*)key.c_str();
  path.len = key.length();
  
  void* result = raxtree_find(this->tree, &path);
  
  if (result == NULL) {
    return env.Null();
  }
  
  int value = reinterpret_cast<intptr_t>(result);
  return Napi::Number::New(env, value);
}

Napi::Value RadixTree::Search(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 1) {
    Napi::TypeError::New(env, "Wrong number of arguments").ThrowAsJavaScriptException();
    return env.Null();
  }

  std::string ele = info[0].As<Napi::String>().Utf8Value();
  rt_str_t path;
  path.buf = (unsigned char*)ele.c_str();
  path.len = ele.length();

  radix_iterator* result = (radix_iterator*)raxtree_search(this->tree, this->treeIt, &path);
  if (result == NULL) {
    return env.Null();
  }

  auto iteratorInstance = RaxIterator::constructor.New({
    Napi::External<radix_tree>::New(env, this->tree),
    Napi::External<radix_iterator>::New(env, result),
    Napi::String::New(env, ele)
  });

  return iteratorInstance;
}

void RadixTree::Cleanup(const Napi::CallbackInfo& info) {
  raxtree_stop(this->treeIt);
  raxtree_destroy(this->tree);
}

Napi::Object InitAll(Napi::Env env, Napi::Object exports) {
  RadixTree::Init(env, exports);
  RaxIterator::Init(env, exports);
  return exports;
}

NODE_API_MODULE(radix_tree, InitAll)